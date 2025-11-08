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

    // getUserSubscriptionTier will automatically sync with Stripe if needed
    const [tier, usageStats] = await Promise.all([
      getUserSubscriptionTier(user.id),
      getUserUsageStats(user.id),
    ]);

    // Fetch updated user data after potential sync
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    return NextResponse.json({
      tier,
      subscriptionStatus: updatedUser?.subscriptionStatus || user.subscriptionStatus,
      currentPeriodEnd: updatedUser?.stripeCurrentPeriodEnd || user.stripeCurrentPeriodEnd,
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


