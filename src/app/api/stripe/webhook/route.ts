import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[Stripe Webhook] Event type: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing webhook: ${error.message}`);
    return new NextResponse(`Webhook handler failed: ${error.message}`, {
      status: 500,
    });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;

  console.log(
    `[Subscription Update] Customer: ${customerId}, Status: ${status}`
  );

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`User not found for customer: ${customerId}`);
    return;
  }

    // Calculate the current period end from billing cycle anchor
    let currentPeriodEnd: Date | null = null;
    if (subscription.billing_cycle_anchor && subscription.items.data[0]?.price.recurring) {
      const interval = subscription.items.data[0].price.recurring.interval;
      const intervalCount = subscription.items.data[0].price.recurring.interval_count || 1;
      
      const anchorDate = new Date(subscription.billing_cycle_anchor * 1000);
      const periodEnd = new Date(anchorDate);
      
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
    }

  // Update user subscription info
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      subscriptionStatus: status,
    },
  });

  console.log(`Updated subscription for user: ${user.email}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log(`[Subscription Deleted] Customer: ${customerId}`);

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`User not found for customer: ${customerId}`);
    return;
  }

  // Set subscription to free tier
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      subscriptionStatus: "free",
    },
  });

  console.log(`Subscription deleted for user: ${user.email}`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    console.log(
      `[Checkout Completed] Customer: ${customerId}, Subscription: ${subscriptionId}`
    );

    if (!subscriptionId) {
      console.error('[Checkout Completed] No subscription ID found in session');
      return;
    }

    // Get the subscription details with expanded invoice
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice'],
    });

    console.log(`[Checkout Completed] Subscription status: ${subscription.status}`);

    // Update user with customer ID if this is their first subscription
    const user = await prisma.user.findFirst({
      where: {
        email: session.customer_details?.email || undefined,
      },
    });

    if (!user) {
      console.error(`[Checkout Completed] User not found for email: ${session.customer_details?.email}`);
      return;
    }

    console.log(`[Checkout Completed] Found user: ${user.email} (ID: ${user.id})`);

    // Calculate the current period end from billing cycle anchor
    let currentPeriodEnd: Date | null = null;
    if (subscription.billing_cycle_anchor && subscription.items.data[0]?.price.recurring) {
      const interval = subscription.items.data[0].price.recurring.interval;
      const intervalCount = subscription.items.data[0].price.recurring.interval_count || 1;
      
      const anchorDate = new Date(subscription.billing_cycle_anchor * 1000);
      const periodEnd = new Date(anchorDate);
      
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
      console.log(`[Checkout Completed] Period end: ${currentPeriodEnd.toISOString()}`);
    }

    const updateData = {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      subscriptionStatus: subscription.status,
    };

    console.log(`[Checkout Completed] Updating user with data:`, updateData);

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log(`[Checkout Completed] ✅ Successfully updated user: ${user.email}`);
  } catch (error) {
    console.error('[Checkout Completed] Error:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // In the new API version, subscription is nested in parent.subscription_details
  const subscriptionId = invoice.parent?.subscription_details?.subscription as string | undefined;

  console.log(`[Payment Succeeded] Customer: ${customerId}`);

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Calculate period end from billing cycle anchor
  let currentPeriodEnd: Date | null = null;
  if (subscription.billing_cycle_anchor && subscription.items.data[0]?.price.recurring) {
    const interval = subscription.items.data[0].price.recurring.interval;
    const intervalCount = subscription.items.data[0].price.recurring.interval_count || 1;
    
    const anchorDate = new Date(subscription.billing_cycle_anchor * 1000);
    const periodEnd = new Date(anchorDate);
    
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
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: subscription.status,
        stripeCurrentPeriodEnd: currentPeriodEnd,
      },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log(`[Payment Failed] Customer: ${customerId}`);

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "past_due",
      },
    });
  }
}


