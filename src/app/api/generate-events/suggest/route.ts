import { NextResponse } from "next/server";
import { suggest_events } from "@/scripts/schedule/suggest-events";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { recordEventAction } from "@/lib/habit-ingestion";
import {
  fetchDailySuggestionsCacheData,
  generateCacheHash,
  checkDailySuggestionsCache,
  writeDailySuggestionsCache,
} from "@/lib/cache-utils";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";

function makeStableSuggestionId(title: string, start: string, end: string) {
  const base = `${title}|${start}|${end}`;
  const hash = crypto.createHash("sha256").update(base).digest("hex");
  return `suggestion-${hash.slice(0, 12)}`;
}

export async function POST(request: Request) {
  try {
    const { userId, timezone, force } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!timezone) {
      return NextResponse.json({ error: "Missing timezone" }, { status: 400 });
    }

    const targetDate = new Date();

    // Fetch all data needed for cache hash (parallelized internally)
    const { data: cacheData, dayKey } = await fetchDailySuggestionsCacheData(
      userId,
      timezone,
      targetDate
    );

    // Generate comprehensive hash including events, goals, bulletins, todos, reminders, and context
    const contentHash = generateCacheHash(cacheData);

    // Try cache first (unless forced)
    if (!force) {
      const cachedSuggestions = await checkDailySuggestionsCache(
        userId,
        timezone,
        dayKey,
        contentHash
      );

      if (cachedSuggestions) {
        const originalEvents = cachedSuggestions.events;

        // Backfill missing IDs deterministically
        let needsUpdate = false;
        const eventsWithIds = originalEvents.map((e: any) => {
          if (e && !e.id && e.title && e.start && e.end) {
            needsUpdate = true;
            return {
              ...e,
              id: makeStableSuggestionId(e.title, e.start, e.end),
            };
          }
          return e;
        });

        // Update cache if IDs were missing
        if (needsUpdate) {
          await writeDailySuggestionsCache(
            userId,
            timezone,
            dayKey,
            contentHash,
            eventsWithIds,
            cachedSuggestions.reminders
          );
        }

        const formattedReminders = cachedSuggestions.reminders.map(
          (reminder: any) => ({
            id: `ai-suggestion-${Date.now()}-${Math.random()}`,
            text: reminder.text,
            time: new Date(reminder.time),
            isAISuggested: true,
            isRead: false,
          })
        );

        return NextResponse.json(
          {
            events: eventsWithIds,
            reminders: formattedReminders,
          },
          { status: 200 }
        );
      }
    }

    // Otherwise generate new suggestions
    const result = await suggest_events(userId, timezone);
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const parsedResult = JSON.parse(cleanedResult);

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

    // Assign deterministic IDs to suggestions if missing (for cache + client)
    const eventsWithIds = (events || []).map((e: any) => {
      if (e && e.title && e.start && e.end) {
        return {
          ...e,
          id: e.id || makeStableSuggestionId(e.title, e.start, e.end),
        };
      }
      return e;
    });

    // Format reminders for local state (don't save to database)
    const formattedReminders = reminders.map((reminder: any) => ({
      id: `ai-suggestion-${Date.now()}-${Math.random()}`, // Generate temporary ID
      text: reminder.text,
      time: new Date(reminder.time),
      isAISuggested: true,
      isRead: false,
    }));

    // Write to cache
    await writeDailySuggestionsCache(
      userId,
      timezone,
      dayKey,
      contentHash,
      eventsWithIds,
      reminders
    );

    return NextResponse.json(
      {
        events: eventsWithIds,
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

export async function PUT(request: Request) {
  try {
    const { userId, timezone, eventId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!timezone) {
      return NextResponse.json({ error: "Missing timezone" }, { status: 400 });
    }
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const targetDate = new Date();
    const { dayKey } = getUtcDayBoundsForTimezone(targetDate, timezone);

    const cache = await prisma.dailySuggestionsCache.findUnique({
      where: {
        userId_timezone_dayKey: {
          userId,
          timezone,
          dayKey,
        },
      },
    });

    if (!cache) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const payload = JSON.parse(cache.payload || "{}");
    const existingEvents = Array.isArray(payload.events) ? payload.events : [];
    const acceptedEvent = existingEvents.find((e: any) => e?.id === eventId);

    // Record acceptance in habit tracking
    if (acceptedEvent && acceptedEvent.title && acceptedEvent.start && acceptedEvent.end) {
      recordEventAction(userId, 'accepted', {
        title: acceptedEvent.title,
        start: new Date(acceptedEvent.start),
        end: new Date(acceptedEvent.end),
      }).catch(err => console.error('Failed to record habit action:', err));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error accepting suggestion:", error);
    return NextResponse.json(
      { error: "Failed to accept suggestion" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, timezone, eventId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!timezone) {
      return NextResponse.json({ error: "Missing timezone" }, { status: 400 });
    }
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const targetDate = new Date();
    const { dayKey } = getUtcDayBoundsForTimezone(targetDate, timezone);

    const cache = await prisma.dailySuggestionsCache.findUnique({
      where: {
        userId_timezone_dayKey: {
          userId,
          timezone,
          dayKey,
        },
      },
    });

    if (!cache) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const payload = JSON.parse(cache.payload || "{}");
    const existingEvents = Array.isArray(payload.events) ? payload.events : [];
    const rejectedEvent = existingEvents.find((e: any) => e?.id === eventId);
    const filteredEvents = existingEvents.filter((e: any) => e?.id !== eventId);

    // No-op if nothing changed
    if (filteredEvents.length === existingEvents.length) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Record rejection in habit tracking
    if (rejectedEvent && rejectedEvent.title && rejectedEvent.start && rejectedEvent.end) {
      recordEventAction(userId, 'rejected', {
        title: rejectedEvent.title,
        start: new Date(rejectedEvent.start),
        end: new Date(rejectedEvent.end),
      }).catch(err => console.error('Failed to record habit action:', err));
    }

    await prisma.dailySuggestionsCache.update({
      where: {
        userId_timezone_dayKey: { userId, timezone, dayKey },
      },
      data: {
        payload: JSON.stringify({
          events: filteredEvents,
          reminders: Array.isArray(payload.reminders)
            ? payload.reminders
            : [],
        }),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error dismissing suggestion:", error);
    return NextResponse.json(
      { error: "Failed to dismiss suggestion" },
      { status: 500 }
    );
  }
}
