import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

/**
 * Calculate the current billing period end date based on the subscription's billing cycle anchor
 * This properly handles multiple billing periods (renewals)
 */
function calculateCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  if (!subscription.billing_cycle_anchor || !subscription.items.data[0]?.price.recurring) {
    return null;
  }

  const interval = subscription.items.data[0].price.recurring.interval;
  const intervalCount = subscription.items.data[0].price.recurring.interval_count || 1;
  const anchorTimestamp = subscription.billing_cycle_anchor * 1000;
  const now = Date.now();

  // Start from the billing cycle anchor
  let periodStart = new Date(anchorTimestamp);
  let periodEnd = new Date(periodStart);

  // Calculate how many milliseconds in one billing period
  const calculatePeriodEnd = (startDate: Date): Date => {
    const endDate = new Date(startDate);
    if (interval === 'month') {
      endDate.setMonth(endDate.getMonth() + intervalCount);
    } else if (interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + intervalCount);
    } else if (interval === 'week') {
      endDate.setDate(endDate.getDate() + (7 * intervalCount));
    } else if (interval === 'day') {
      endDate.setDate(endDate.getDate() + intervalCount);
    }
    return endDate;
  };

  // Find the current billing period by advancing from the anchor date
  periodEnd = calculatePeriodEnd(periodStart);
  
  // Keep advancing periods until we find the one that contains "now"
  while (periodEnd.getTime() <= now) {
    periodStart = new Date(periodEnd);
    periodEnd = calculatePeriodEnd(periodStart);
  }

  return periodEnd;
}

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

    // Calculate the current billing period end
    const currentPeriodEnd = calculateCurrentPeriodEnd(subscription);
    console.log(`[Sync Subscription] Calculated period end: ${currentPeriodEnd?.toISOString()}`);

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

