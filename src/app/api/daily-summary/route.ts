import { NextResponse } from "next/server";
import { daily_summary } from "@/scripts/schedule/daily-summary";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { date, timezone, userId, goalsView } = await request.json();

    const targetDate = new Date(date);

    // Compute user's local day bounds (UTC instants) and dayKey
    const { dayKey, startUtc, endUtc } = getUtcDayBoundsForTimezone(
      targetDate,
      timezone
    );

    // Fetch events for that local day and compute a stable hash
    const eventsForDay = await prisma.event.findMany({
      where: {
        userId,
        // Include any event that overlaps the user's local day
        // start < endOfDay AND end > startOfDay
        AND: [
          { start: { lt: endUtc } },
          { end: { gt: startUtc } },
        ],
      },
      select: { id: true, title: true, start: true, end: true },
      orderBy: { start: "asc" },
    });

    const normalized = eventsForDay.map((e) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start).toISOString(),
      end: new Date(e.end).toISOString(),
    }));
    const eventsHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");

    // Try cache first
    const cache = await prisma.dailySummaryCache.findUnique({
      where: {
        userId_timezone_dayKey: {
          userId,
          timezone,
          dayKey,
        },
      },
    });

    if (cache && cache.eventsHash === eventsHash) {
      return NextResponse.json({ result: cache.summary }, { status: 200 });
    }

    // Generate new summary and upsert cache
    const result = await daily_summary(targetDate, timezone, userId, goalsView);

    await prisma.dailySummaryCache.upsert({
      where: {
        userId_timezone_dayKey: {
          userId,
          timezone,
          dayKey,
        },
      },
      update: {
        eventsHash,
        summary: result,
      },
      create: {
        userId,
        timezone,
        dayKey,
        eventsHash,
        summary: result,
      },
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return NextResponse.json(
      { error: "Failed to generate daily summary" },
      { status: 500 }
    );
  }
}
