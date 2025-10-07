import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUserSubscriptionTier, getUserUsageStats } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    console.log(`[Subscription Status] User: ${session.user.email}`);
    console.log(`[Subscription Status] DB values:`, {
      subscriptionStatus: user.subscriptionStatus,
      stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
    });

    const [tier, usageStats] = await Promise.all([
      getUserSubscriptionTier(user.id),
      getUserUsageStats(user.id),
    ]);

    console.log(`[Subscription Status] Calculated tier: ${tier}`);

    return NextResponse.json({
      tier,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.stripeCurrentPeriodEnd,
      hasStripeCustomer: !!user.stripeCustomerId,
      hasActiveSubscription: !!user.stripeSubscriptionId,
      usage: usageStats,
    });
  } catch (error: any) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}


