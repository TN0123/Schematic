import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { daily_summary } from "@/scripts/schedule/daily-summary";
import {
  fetchDailySummaryCacheData,
  generateCacheHash,
  checkDailySummaryCache,
  writeDailySummaryCache,
} from "@/lib/cache-utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, timezone, userId, goalsView } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Ensure the user is only requesting their own summary
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetDate = new Date(date);

    // Fetch all data needed for cache hash (parallelized internally)
    const { data: cacheData, dayKey } = await fetchDailySummaryCacheData(
      userId,
      timezone,
      targetDate,
      goalsView
    );

    // Generate comprehensive hash including events, goals, context, and view
    const contentHash = generateCacheHash(cacheData);

    // Try cache first
    const cachedSummary = await checkDailySummaryCache(
      userId,
      timezone,
      dayKey,
      contentHash
    );

    if (cachedSummary) {
      return NextResponse.json({ result: cachedSummary }, { status: 200 });
    }

    // Generate new summary
    const result = await daily_summary(targetDate, timezone, userId, goalsView);

    // Write to cache
    await writeDailySummaryCache(userId, timezone, dayKey, contentHash, result);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return NextResponse.json(
      { error: "Failed to generate daily summary" },
      { status: 500 }
    );
  }
}
