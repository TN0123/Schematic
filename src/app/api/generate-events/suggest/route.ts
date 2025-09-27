import { NextResponse } from "next/server";
import { suggest_events } from "@/scripts/schedule/suggest-events";
import prisma from "@/lib/prisma";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { userId, timezone } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!timezone) {
      return NextResponse.json({ error: "Missing timezone" }, { status: 400 });
    }

    // Compute day bounds and hash today's overlapping events for stable cache key
    const targetDate = new Date();
    const { dayKey, startUtc, endUtc } = getUtcDayBoundsForTimezone(
      targetDate,
      timezone
    );

    const eventsForDay = await prisma.event.findMany({
      where: {
        userId,
        AND: [{ start: { lt: endUtc } }, { end: { gt: startUtc } }],
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
    const cache = await prisma.dailySuggestionsCache.findUnique({
      where: {
        userId_timezone_dayKey: {
          userId,
          timezone,
          dayKey,
        },
      },
    });

    if (cache && cache.eventsHash === eventsHash) {
      const payload = JSON.parse(cache.payload);

      const formattedReminders = (payload.reminders || []).map((reminder: any) => ({
        id: `ai-suggestion-${Date.now()}-${Math.random()}`,
        text: reminder.text,
        time: new Date(reminder.time),
        isAISuggested: true,
        isRead: false,
      }));

      return NextResponse.json(
        {
          events: payload.events || [],
          reminders: formattedReminders,
        },
        { status: 200 }
      );
    }

    // Otherwise generate new suggestions
    const result = await suggest_events(userId, timezone);
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const parsedResult = JSON.parse(cleanedResult);

    // Handle backward compatibility - if result is array, it's just events
    let events = [];
    let reminders = [];

    if (Array.isArray(parsedResult)) {
      // Old format - just events
      events = parsedResult;
    } else {
      // New format - object with events and reminders
      events = parsedResult.events || [];
      reminders = parsedResult.reminders || [];
    }

    // Format reminders for local state (don't save to database)
    const formattedReminders = reminders.map((reminder: any) => ({
      id: `ai-suggestion-${Date.now()}-${Math.random()}`, // Generate temporary ID
      text: reminder.text,
      time: new Date(reminder.time),
      isAISuggested: true,
      isRead: false,
    }));

    // Upsert cache with raw payload (without client-only fields)
    await prisma.dailySuggestionsCache.upsert({
      where: {
        userId_timezone_dayKey: {
          userId,
          timezone,
          dayKey,
        },
      },
      update: {
        eventsHash,
        payload: JSON.stringify({ events, reminders }),
      },
      create: {
        userId,
        timezone,
        dayKey,
        eventsHash,
        payload: JSON.stringify({ events, reminders }),
      },
    });

    return NextResponse.json(
      {
        events,
        reminders: formattedReminders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error suggesting events and reminders:", error);
    return NextResponse.json(
      { error: "Failed to suggest events and reminders" },
      { status: 500 }
    );
  }
}
