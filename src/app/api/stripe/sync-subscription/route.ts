import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// Fallback endpoint to sync subscription data if webhooks don't work
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    console.log(`[Sync Subscription] Retrieving session: ${sessionId}`);

    // Retrieve the checkout session
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (checkoutSession.mode !== 'subscription') {
      return NextResponse.json(
        { error: "Session is not a subscription" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Extract customer ID (handle both string and expanded object)
    const customerId = typeof checkoutSession.customer === 'string'
      ? checkoutSession.customer
      : checkoutSession.customer?.id;
    
    // Handle both string and expanded object cases
    let subscription: Stripe.Subscription;
    
    if (typeof checkoutSession.subscription === 'string') {
      console.log(`[Sync Subscription] Retrieving subscription: ${checkoutSession.subscription}`);
      // Get the subscription details with expanded invoice
      subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription, {
        expand: ['latest_invoice'],
      });
    } else if (checkoutSession.subscription && typeof checkoutSession.subscription === 'object') {
      console.log(`[Sync Subscription] Using expanded subscription: ${checkoutSession.subscription.id}`);
      subscription = checkoutSession.subscription as Stripe.Subscription;
      
      // Expand the invoice if not already expanded
      if (!subscription.latest_invoice || typeof subscription.latest_invoice === 'string') {
        subscription = await stripe.subscriptions.retrieve(subscription.id, {
          expand: ['latest_invoice'],
        });
      }
    } else {
      return NextResponse.json(
        { error: "No subscription found in session" },
        { status: 400 }
      );
    }

    // Calculate the current period end from billing cycle anchor
    // For monthly subscriptions, period end is anchor + interval
    let currentPeriodEnd: Date | null = null;
    
    if (subscription.billing_cycle_anchor) {
      // Get the interval from the first price
      const interval = subscription.items.data[0]?.price.recurring?.interval;
      const intervalCount = subscription.items.data[0]?.price.recurring?.interval_count || 1;
      
      const anchorDate = new Date(subscription.billing_cycle_anchor * 1000);
      const periodEnd = new Date(anchorDate);
      
      // Calculate period end based on interval
      if (interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
      } else if (interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
      } else if (interval === 'week') {
        periodEnd.setDate(periodEnd.getDate() + (7 * intervalCount));
      } else if (interval === 'day') {
        periodEnd.setDate(periodEnd.getDate() + intervalCount);
      }
      
      currentPeriodEnd = periodEnd;
      console.log(`[Sync Subscription] Calculated period end: ${currentPeriodEnd.toISOString()} (interval: ${interval})`);
    }

    const updateData = {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      subscriptionStatus: subscription.status,
    };

    console.log(`[Sync Subscription] Updating user:`, updateData);

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log(`[Sync Subscription] ✅ Successfully synced subscription for user: ${user.email}`);

    return NextResponse.json({ 
      success: true,
      subscription: {
        status: subscription.status,
        currentPeriodEnd,
      }
    });
  } catch (error: any) {
    console.error("[Sync Subscription] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync subscription" },
      { status: 500 }
    );
  }
}

