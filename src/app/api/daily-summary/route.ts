import { NextResponse } from "next/server";
import { daily_summary } from "@/scripts/schedule/daily-summary";
import {
  fetchDailySummaryCacheData,
  generateCacheHash,
  checkDailySummaryCache,
  writeDailySummaryCache,
} from "@/lib/cache-utils";

export async function POST(request: Request) {
  try {
    const { date, timezone, userId, goalsView } = await request.json();

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
