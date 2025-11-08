import prisma from "./prisma";
import Stripe from "stripe";

// Subscription tier types
export type SubscriptionTier = "free" | "premium";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-09-30.clover",
});

// Subscription limits
export const SUBSCRIPTION_LIMITS = {
  free: {
    documents: 10,
    bulletins: 10,
    weeklyPremiumUses: 10,
    monthlyPremiumUses: 0, // No monthly uses on free tier
  },
  premium: {
    documents: Infinity, // Unlimited
    bulletins: Infinity, // Unlimited
    weeklyPremiumUses: 0, // No weekly limit on premium
    monthlyPremiumUses: 150,
  },
};

/**
 * Sync subscription data from Stripe
 */
async function syncSubscriptionFromStripe(
  subscriptionId: string
): Promise<{
  currentPeriodEnd: Date | null;
  status: string;
  priceId: string | null;
} | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Use Stripe's current_period_end directly (most reliable)
    const periodEnd = (subscription as any).current_period_end;
    const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : null;

    return {
      currentPeriodEnd,
      status: subscription.status,
      priceId: subscription.items.data[0]?.price.id || null,
    };
  } catch (error) {
    console.error(`[Sync Subscription] Error syncing subscription ${subscriptionId}:`, error);
    return null;
  }
}

/**
 * Get the user's current subscription tier
 * Automatically syncs with Stripe if the period end has passed
 */
export async function getUserSubscriptionTier(
  userId: string
): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      stripeCurrentPeriodEnd: true,
      stripeSubscriptionId: true,
    },
  });

  if (!user) {
    return "free";
  }

  // Check if subscription is active and not expired
  const now = new Date();
  const periodEnd = user.stripeCurrentPeriodEnd ? new Date(user.stripeCurrentPeriodEnd) : null;

  // For active subscriptions, check if they're still valid
  if (user.subscriptionStatus === "active") {
    // If there's a period end date, check if it's in the future
    if (periodEnd) {
      if (periodEnd > now) {
        return "premium";
      } else {
        // Period end has passed - sync with Stripe to get updated period end
        // This handles subscription renewals
        if (user.stripeSubscriptionId) {
          console.log(`[Subscription Tier] Period end passed, syncing subscription ${user.stripeSubscriptionId} for user ${userId}`);
          const syncResult = await syncSubscriptionFromStripe(user.stripeSubscriptionId);
          
          if (syncResult) {
            // Update the user's subscription data
            // Also update monthlyPremiumUsesResetAt to match the new period end
            const updateData: any = {
              stripeCurrentPeriodEnd: syncResult.currentPeriodEnd,
              subscriptionStatus: syncResult.status,
              stripePriceId: syncResult.priceId,
            };

            // If we have a new period end and subscription is active, update the reset date
            if (syncResult.status === "active" && syncResult.currentPeriodEnd) {
              updateData.monthlyPremiumUsesResetAt = syncResult.currentPeriodEnd;
            }

            await prisma.user.update({
              where: { id: userId },
              data: updateData,
            });

            // Check again with updated data
            if (syncResult.status === "active" && syncResult.currentPeriodEnd && syncResult.currentPeriodEnd > now) {
              return "premium";
            }
          }
        }
      }
    } else {
      // If periodEnd is null but subscription is active, it's likely a lifetime subscription
      // But let's sync with Stripe to be sure
      if (user.stripeSubscriptionId) {
        console.log(`[Subscription Tier] No period end, syncing subscription ${user.stripeSubscriptionId} for user ${userId}`);
        const syncResult = await syncSubscriptionFromStripe(user.stripeSubscriptionId);
        
        if (syncResult) {
          const updateData: any = {
            stripeCurrentPeriodEnd: syncResult.currentPeriodEnd,
            subscriptionStatus: syncResult.status,
            stripePriceId: syncResult.priceId,
          };

          // If we have a new period end and subscription is active, update the reset date
          if (syncResult.status === "active" && syncResult.currentPeriodEnd) {
            updateData.monthlyPremiumUsesResetAt = syncResult.currentPeriodEnd;
          }

          await prisma.user.update({
            where: { id: userId },
            data: updateData,
          });

          if (syncResult.status === "active") {
            return "premium";
          }
        } else {
          // If sync fails but subscription is marked active, treat as premium (lifetime)
          return "premium";
        }
      } else {
        // No subscription ID but marked active - treat as premium (lifetime)
        return "premium";
      }
    }
  }

  return "free";
}

/**
 * Check if user can create a new document
 */
export async function canCreateDocument(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}> {
  const tier = await getUserSubscriptionTier(userId);

  // Premium users have unlimited documents
  if (tier === "premium") {
    return { allowed: true };
  }

  // Count user's existing documents
  const documentCount = await prisma.document.count({
    where: { userId },
  });

  const limit = SUBSCRIPTION_LIMITS.free.documents;

  if (documentCount >= limit) {
    return {
      allowed: false,
      reason: `You've reached the free tier limit of ${limit} documents. Upgrade to premium for unlimited documents.`,
      currentCount: documentCount,
      limit,
    };
  }

  return { allowed: true, currentCount: documentCount, limit };
}

/**
 * Check if user can create a new bulletin/note
 */
export async function canCreateBulletin(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}> {
  const tier = await getUserSubscriptionTier(userId);

  // Premium users have unlimited bulletins
  if (tier === "premium") {
    return { allowed: true };
  }

  // Count user's existing bulletins
  const bulletinCount = await prisma.bulletin.count({
    where: { userId },
  });

  const limit = SUBSCRIPTION_LIMITS.free.bulletins;

  if (bulletinCount >= limit) {
    return {
      allowed: false,
      reason: `You've reached the free tier limit of ${limit} notes. Upgrade to premium for unlimited notes.`,
      currentCount: bulletinCount,
      limit,
    };
  }

  return { allowed: true, currentCount: bulletinCount, limit };
}

/**
 * Check if user can use premium AI models and track usage
 */
export async function canUsePremiumModel(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remainingUses?: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      stripeCurrentPeriodEnd: true,
      weeklyPremiumUsesCount: true,
      weeklyPremiumUsesResetAt: true,
      monthlyPremiumUsesCount: true,
      monthlyPremiumUsesResetAt: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const tier = await getUserSubscriptionTier(userId);
  const now = new Date();

  if (tier === "premium") {
    // Check monthly limit for premium users
    let monthlyCount = user.monthlyPremiumUsesCount;

    // Reset monthly counter if needed
    if (
      !user.monthlyPremiumUsesResetAt ||
      user.monthlyPremiumUsesResetAt <= now
    ) {
      monthlyCount = 0;
      // We'll reset this when actually using
    }

    const monthlyLimit = SUBSCRIPTION_LIMITS.premium.monthlyPremiumUses;
    if (monthlyCount >= monthlyLimit) {
      return {
        allowed: false,
        reason: `You've used all ${monthlyLimit} premium AI requests this month. Resets on ${user.monthlyPremiumUsesResetAt?.toLocaleDateString()}.`,
        remainingUses: 0,
      };
    }

    return {
      allowed: true,
      remainingUses: monthlyLimit - monthlyCount,
    };
  } else {
    // Check weekly limit for free users
    let weeklyCount = user.weeklyPremiumUsesCount;

    // Reset weekly counter if needed
    if (
      !user.weeklyPremiumUsesResetAt ||
      user.weeklyPremiumUsesResetAt <= now
    ) {
      weeklyCount = 0;
      // We'll reset this when actually using
    }

    const weeklyLimit = SUBSCRIPTION_LIMITS.free.weeklyPremiumUses;
    if (weeklyCount >= weeklyLimit) {
      return {
        allowed: false,
        reason: `You've used all ${weeklyLimit} premium AI requests this week. Upgrade to premium for 150 monthly uses.`,
        remainingUses: 0,
      };
    }

    return {
      allowed: true,
      remainingUses: weeklyLimit - weeklyCount,
    };
  }
}

/**
 * Track a premium model usage and update counters
 */
export async function trackPremiumUsage(userId: string): Promise<{
  success: boolean;
  remainingUses: number;
}> {
  const tier = await getUserSubscriptionTier(userId);
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weeklyPremiumUsesCount: true,
      weeklyPremiumUsesResetAt: true,
      monthlyPremiumUsesCount: true,
      monthlyPremiumUsesResetAt: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return { success: false, remainingUses: 0 };
  }

  if (tier === "premium") {
    // Handle monthly tracking for premium users
    const needsReset =
      !user.monthlyPremiumUsesResetAt ||
      user.monthlyPremiumUsesResetAt <= now;

    // Use the Stripe billing period end date if available, otherwise calculate from current period end
    let nextResetDate: Date;
    if (user.stripeCurrentPeriodEnd) {
      nextResetDate = new Date(user.stripeCurrentPeriodEnd);
    } else {
      // Fallback: if no period end is set, use first of next month
      nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      nextResetDate.setDate(1);
      nextResetDate.setHours(0, 0, 0, 0);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: needsReset
        ? {
            monthlyPremiumUsesCount: 1,
            monthlyPremiumUsesResetAt: nextResetDate,
          }
        : {
            monthlyPremiumUsesCount: { increment: 1 },
          },
      select: { monthlyPremiumUsesCount: true },
    });

    const limit = SUBSCRIPTION_LIMITS.premium.monthlyPremiumUses;
    return {
      success: true,
      remainingUses: limit - updatedUser.monthlyPremiumUsesCount,
    };
  } else {
    // Handle weekly tracking for free users
    const needsReset =
      !user.weeklyPremiumUsesResetAt || user.weeklyPremiumUsesResetAt <= now;

    const nextResetDate = new Date();
    nextResetDate.setDate(nextResetDate.getDate() + 7);
    nextResetDate.setHours(0, 0, 0, 0);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: needsReset
        ? {
            weeklyPremiumUsesCount: 1,
            weeklyPremiumUsesResetAt: nextResetDate,
          }
        : {
            weeklyPremiumUsesCount: { increment: 1 },
          },
      select: { weeklyPremiumUsesCount: true },
    });

    const limit = SUBSCRIPTION_LIMITS.free.weeklyPremiumUses;
    return {
      success: true,
      remainingUses: limit - updatedUser.weeklyPremiumUsesCount,
    };
  }
}

/**
 * Get user's current usage stats
 */
export async function getUserUsageStats(userId: string) {
  const [tier, documentCount, bulletinCount, user] = await Promise.all([
    getUserSubscriptionTier(userId),
    prisma.document.count({ where: { userId } }),
    prisma.bulletin.count({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        weeklyPremiumUsesCount: true,
        weeklyPremiumUsesResetAt: true,
        monthlyPremiumUsesCount: true,
        monthlyPremiumUsesResetAt: true,
      },
    }),
  ]);

  if (!user) {
    return null;
  }

  const now = new Date();
  const limits = SUBSCRIPTION_LIMITS[tier];

  // Reset counters if needed
  const weeklyNeedsReset =
    !user.weeklyPremiumUsesResetAt || user.weeklyPremiumUsesResetAt <= now;
  const monthlyNeedsReset =
    !user.monthlyPremiumUsesResetAt || user.monthlyPremiumUsesResetAt <= now;

  const weeklyUsed = weeklyNeedsReset ? 0 : user.weeklyPremiumUsesCount;
  const monthlyUsed = monthlyNeedsReset ? 0 : user.monthlyPremiumUsesCount;

  return {
    tier,
    documents: {
      used: documentCount,
      limit: limits.documents,
      canCreate: tier === "premium" || documentCount < limits.documents,
    },
    bulletins: {
      used: bulletinCount,
      limit: limits.bulletins,
      canCreate: tier === "premium" || bulletinCount < limits.bulletins,
    },
    premiumUses: {
      used: tier === "premium" ? monthlyUsed : weeklyUsed,
      limit:
        tier === "premium"
          ? limits.monthlyPremiumUses
          : limits.weeklyPremiumUses,
      resetAt:
        tier === "premium"
          ? user.monthlyPremiumUsesResetAt
          : user.weeklyPremiumUsesResetAt,
      period: tier === "premium" ? "monthly" : "weekly",
    },
  };
}


