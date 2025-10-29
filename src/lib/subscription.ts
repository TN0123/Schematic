import prisma from "./prisma";

// Subscription tier types
export type SubscriptionTier = "free" | "premium";

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
 * Get the user's current subscription tier
 */
export async function getUserSubscriptionTier(
  userId: string
): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return "free";
  }

  // Check if subscription is active and not expired
  const now = new Date();
  const periodEnd = user.stripeCurrentPeriodEnd ? new Date(user.stripeCurrentPeriodEnd) : null;

  if (
    user.subscriptionStatus === "active" &&
    periodEnd &&
    periodEnd > now
  ) {
    return "premium";
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


