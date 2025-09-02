import { NextResponse } from "next/server";
import { daily_summary } from "@/scripts/schedule/daily-summary";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { date, timezone, userId } = await request.json();

    const targetDate = new Date(date);

    // Build the local day key in user's timezone (YYYY-MM-DD)
    const dayKey = targetDate.toLocaleDateString("en-CA", { timeZone: timezone });

    // Compute user's timezone day start/end in UTC for DB filtering
    const userDateStr = dayKey; // already en-CA format
    const startOfDay = new Date(`${userDateStr}T00:00:00.000`);
    const endOfDay = new Date(`${userDateStr}T23:59:59.999`);
    const testDate = new Date(userDateStr + "T12:00:00");
    const utcTime = testDate.getTime();
    const userTzTime = new Date(
      testDate.toLocaleString("en-US", { timeZone: timezone })
    ).getTime();
    const offsetMs = utcTime - userTzTime;
    const startOfDayAdjusted = new Date(startOfDay.getTime() + offsetMs);
    const endOfDayAdjusted = new Date(endOfDay.getTime() + offsetMs);

    // Fetch events for that local day and compute a stable hash
    const eventsForDay = await prisma.event.findMany({
      where: {
        userId,
        start: {
          gte: startOfDayAdjusted,
          lte: endOfDayAdjusted,
        },
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
    const result = await daily_summary(targetDate, timezone, userId);

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
