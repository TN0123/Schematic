import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";
import { aggregateAllTodos } from "@/lib/todo-aggregation";

/**
 * Comprehensive data structure for cache hash generation
 */
interface CacheHashData {
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
  }>;
  scheduleContext?: string;
  goalText?: string;
  goals?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  bulletins?: Array<{
    id: string;
    title: string;
    updatedAt: Date;
  }>;
  todoBulletins?: Array<{
    id: string;
    title: string;
    updatedAt: Date;
    itemsHash: string; // Hash of unchecked todo items
  }>;
  aggregatedTodos?: Array<{
    id: string;
    text: string;
    checked: boolean;
    dueDate?: string;
    noteTitle: string;
    noteId: string;
  }>;
  reminders?: Array<{
    id: string;
    text: string;
    time: Date;
  }>;
  // Additional parameters that affect the output
  additionalContext?: Record<string, any>;
}

/**
 * Generate a stable hash from cache data
 */
export function generateCacheHash(data: CacheHashData): string {
  // Sort events by start time for consistency
  const sortedEvents = [...data.events].sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  // Create a stable object with sorted and normalized data
  const normalized = {
    events: sortedEvents,
    scheduleContext: data.scheduleContext || "",
    goalText: data.goalText || "",
    goals: data.goals
      ? [...data.goals].sort((a, b) => a.id.localeCompare(b.id))
      : [],
    bulletins: data.bulletins
      ? data.bulletins.map((b) => ({
          id: b.id,
          title: b.title,
          updatedAt: b.updatedAt.toISOString(),
        }))
      : [],
    todoBulletins: data.todoBulletins
      ? data.todoBulletins.map((t) => ({
          id: t.id,
          title: t.title,
          updatedAt: t.updatedAt.toISOString(),
          itemsHash: t.itemsHash,
        }))
      : [],
    aggregatedTodos: data.aggregatedTodos
      ? [...data.aggregatedTodos].sort((a, b) => a.id.localeCompare(b.id))
      : [],
    reminders: data.reminders
      ? [...data.reminders].sort((a, b) => a.time.getTime() - b.time.getTime())
      : [],
    additionalContext: data.additionalContext || {},
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

/**
 * Fetch all data needed for daily summary cache hash
 * Uses Promise.all for maximum parallelization
 */
export async function fetchDailySummaryCacheData(
  userId: string,
  timezone: string,
  targetDate: Date,
  goalsView?: "list" | "text" | "todo"
): Promise<{ data: CacheHashData; dayKey: string; startUtc: Date; endUtc: Date }> {
  const { dayKey, startUtc, endUtc } = getUtcDayBoundsForTimezone(
    targetDate,
    timezone
  );

  // Parallelize all database queries
  const [eventsForDay, user, goals, todoBulletins, aggregatedTodos] = await Promise.all([
    // 1. Fetch events for the day
    prisma.event.findMany({
      where: {
        userId,
        AND: [{ start: { lt: endUtc } }, { end: { gt: startUtc } }],
      },
      select: { id: true, title: true, start: true, end: true },
      orderBy: { start: "asc" },
    }),

    // 2. Fetch user context
    prisma.user.findUnique({
      where: { id: userId },
      select: { scheduleContext: true, goalText: true },
    }),

    // 3. Fetch goals (only if needed for this view)
    goalsView === "list" || !goalsView
      ? prisma.goal.findMany({
          where: { userId },
          select: { id: true, title: true, type: true },
        })
      : Promise.resolve([]),

    // 4. Fetch todo bulletins (only if needed for this view)
    goalsView === "todo"
      ? prisma.bulletin.findMany({
          where: { userId, type: "todo" },
          orderBy: { updatedAt: "desc" },
          take: 5, // Top 5 most recent todo lists
          select: { id: true, title: true, data: true, updatedAt: true },
        })
      : Promise.resolve([]),

    // 5. Fetch aggregated todos (only if needed for this view)
    goalsView === "todo"
      ? aggregateAllTodos(userId, 50)
      : Promise.resolve([]),
  ]);

  // Normalize events
  const normalizedEvents = eventsForDay.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start).toISOString(),
    end: new Date(e.end).toISOString(),
  }));

  // Process todo bulletins to extract unchecked items hash
  const processedTodoBulletins = todoBulletins.map((bulletin) => {
    const items = (bulletin.data as any)?.items || [];
    const uncheckedItems = items
      .filter((item: any) => !item.checked)
      .map((item: any) => ({
        text: item.text,
        dueDate: item.dueDate,
      }));

    const itemsHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(uncheckedItems))
      .digest("hex");

    return {
      id: bulletin.id,
      title: bulletin.title,
      updatedAt: bulletin.updatedAt,
      itemsHash,
    };
  });

  const cacheData: CacheHashData = {
    events: normalizedEvents,
    scheduleContext: user?.scheduleContext,
    goalText: user?.goalText,
    goals: goals.length > 0 ? goals.map(g => ({ id: g.id, title: g.title, type: g.type })) : undefined,
    todoBulletins:
      processedTodoBulletins.length > 0 ? processedTodoBulletins : undefined,
    aggregatedTodos: aggregatedTodos.length > 0 ? aggregatedTodos : undefined,
    additionalContext: {
      goalsView: goalsView || "list",
    },
  };

  return { data: cacheData, dayKey, startUtc, endUtc };
}

/**
 * Fetch all data needed for daily suggestions cache hash
 * Uses Promise.all for maximum parallelization
 */
export async function fetchDailySuggestionsCacheData(
  userId: string,
  timezone: string,
  targetDate: Date
): Promise<{ data: CacheHashData; dayKey: string; startUtc: Date; endUtc: Date }> {
  const { dayKey, startUtc, endUtc } = getUtcDayBoundsForTimezone(
    targetDate,
    timezone
  );

  // Parallelize ALL database queries for maximum performance
  const [eventsForDay, remindersForDay, user, bulletins, goals, todoBulletins, aggregatedTodos] =
    await Promise.all([
      // 1. Fetch events for the day
      prisma.event.findMany({
        where: {
          userId,
          AND: [{ start: { lt: endUtc } }, { end: { gt: startUtc } }],
        },
        select: { id: true, title: true, start: true, end: true },
        orderBy: { start: "asc" },
      }),

      // 2. Fetch reminders for the day
      prisma.reminder.findMany({
        where: {
          userId,
          time: { gte: startUtc, lte: endUtc },
        },
        select: { id: true, text: true, time: true },
        orderBy: { time: "asc" },
      }),

      // 3. Fetch user context
      prisma.user.findUnique({
        where: { id: userId },
        select: { scheduleContext: true, goalText: true },
      }),

      // 4. Fetch recent bulletins (top 10 most recent)
      prisma.bulletin.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, title: true, updatedAt: true },
      }),

      // 5. Fetch goals
      prisma.goal.findMany({
        where: { userId },
        select: { id: true, title: true, type: true },
      }),

      // 6. Fetch todo bulletins (top 5 most recent)
      prisma.bulletin.findMany({
        where: { userId, type: "todo" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, data: true, updatedAt: true },
      }),

      // 7. Fetch aggregated todos
      aggregateAllTodos(userId, 50),
    ]);

  // Normalize events
  const normalizedEvents = eventsForDay.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start).toISOString(),
    end: new Date(e.end).toISOString(),
  }));

  // Process todo bulletins to extract unchecked items with due dates
  const processedTodoBulletins = todoBulletins.map((bulletin) => {
    const items = (bulletin.data as any)?.items || [];
    const uncheckedItems = items
      .filter((item: any) => !item.checked)
      .map((item: any) => ({
        text: item.text,
        dueDate: item.dueDate,
      }))
      .sort((a: any, b: any) => {
        // Sort by due date for stable hashing
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });

    const itemsHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(uncheckedItems))
      .digest("hex");

    return {
      id: bulletin.id,
      title: bulletin.title,
      updatedAt: bulletin.updatedAt,
      itemsHash,
    };
  });

  const cacheData: CacheHashData = {
    events: normalizedEvents,
    scheduleContext: user?.scheduleContext,
    goalText: user?.goalText,
    goals: goals.map(g => ({ id: g.id, title: g.title, type: g.type })),
    bulletins,
    todoBulletins: processedTodoBulletins,
    aggregatedTodos: aggregatedTodos,
    reminders: remindersForDay.map((r) => ({
      id: r.id,
      text: r.text,
      time: r.time,
    })),
  };

  return { data: cacheData, dayKey, startUtc, endUtc };
}

/**
 * Check daily summary cache and return cached result if valid
 */
export async function checkDailySummaryCache(
  userId: string,
  timezone: string,
  dayKey: string,
  contentHash: string
): Promise<string | null> {
  const cache = await prisma.dailySummaryCache.findUnique({
    where: {
      userId_timezone_dayKey: {
        userId,
        timezone,
        dayKey,
      },
    },
  });

  if (cache && cache.eventsHash === contentHash) {
    return cache.summary;
  }

  return null;
}

/**
 * Write daily summary to cache
 */
export async function writeDailySummaryCache(
  userId: string,
  timezone: string,
  dayKey: string,
  contentHash: string,
  summary: string
): Promise<void> {
  await prisma.dailySummaryCache.upsert({
    where: {
      userId_timezone_dayKey: {
        userId,
        timezone,
        dayKey,
      },
    },
    update: {
      eventsHash: contentHash,
      summary,
    },
    create: {
      userId,
      timezone,
      dayKey,
      eventsHash: contentHash,
      summary,
    },
  });
}

/**
 * Check daily suggestions cache and return cached result if valid
 */
export async function checkDailySuggestionsCache(
  userId: string,
  timezone: string,
  dayKey: string,
  contentHash: string
): Promise<{ events: any[]; reminders: any[] } | null> {
  const cache = await prisma.dailySuggestionsCache.findUnique({
    where: {
      userId_timezone_dayKey: {
        userId,
        timezone,
        dayKey,
      },
    },
  });

  if (cache && cache.eventsHash === contentHash) {
    const payload = JSON.parse(cache.payload || "{}");
    return {
      events: Array.isArray(payload.events) ? payload.events : [],
      reminders: Array.isArray(payload.reminders) ? payload.reminders : [],
    };
  }

  return null;
}

/**
 * Write daily suggestions to cache
 */
export async function writeDailySuggestionsCache(
  userId: string,
  timezone: string,
  dayKey: string,
  contentHash: string,
  events: any[],
  reminders: any[]
): Promise<void> {
  await prisma.dailySuggestionsCache.upsert({
    where: {
      userId_timezone_dayKey: {
        userId,
        timezone,
        dayKey,
      },
    },
    update: {
      eventsHash: contentHash,
      payload: JSON.stringify({ events, reminders }),
    },
    create: {
      userId,
      timezone,
      dayKey,
      eventsHash: contentHash,
      payload: JSON.stringify({ events, reminders }),
    },
  });
}

/**
 * Invalidate cache entries for a specific user and day
 * Call this when events, goals, bulletins, or user context changes
 */
export async function invalidateDayCache(
  userId: string,
  timezone: string,
  date: Date
): Promise<void> {
  const { dayKey } = getUtcDayBoundsForTimezone(date, timezone);

  await Promise.all([
    // Delete daily summary cache for this day
    prisma.dailySummaryCache
      .deleteMany({
        where: {
          userId,
          timezone,
          dayKey,
        },
      })
      .catch(() => {
        // Ignore errors if cache doesn't exist
      }),

    // Delete daily suggestions cache for this day
    prisma.dailySuggestionsCache
      .deleteMany({
        where: {
          userId,
          timezone,
          dayKey,
        },
      })
      .catch(() => {
        // Ignore errors if cache doesn't exist
      }),
  ]);
}

/**
 * Invalidate all cache entries for a user
 * Call this when user settings change (context, goals, etc.) that affect all days
 */
export async function invalidateAllUserCaches(userId: string): Promise<void> {
  await Promise.all([
    prisma.dailySummaryCache.deleteMany({ where: { userId } }),
    prisma.dailySuggestionsCache.deleteMany({ where: { userId } }),
  ]);
}

/**
 * Invalidate cache for an event that spans specific dates
 * Determines which days need invalidation based on event start/end times
 */
export async function invalidateCacheForEvent(
  userId: string,
  timezone: string,
  eventStart: Date,
  eventEnd: Date
): Promise<void> {
  // Get the dayKeys for start and end dates
  const startDayKey = getUtcDayBoundsForTimezone(eventStart, timezone).dayKey;
  const endDayKey = getUtcDayBoundsForTimezone(eventEnd, timezone).dayKey;

  const dayKeysToInvalidate = new Set<string>([startDayKey]);

  // If event spans multiple days, add all affected days
  if (startDayKey !== endDayKey) {
    dayKeysToInvalidate.add(endDayKey);

    // For multi-day events, also invalidate all days in between
    const currentDate = new Date(eventStart);
    const endDate = new Date(eventEnd);

    while (currentDate <= endDate) {
      const dayKey = getUtcDayBoundsForTimezone(currentDate, timezone).dayKey;
      dayKeysToInvalidate.add(dayKey);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Invalidate all affected days in parallel
  await Promise.all(
    Array.from(dayKeysToInvalidate).map((dayKey) =>
      Promise.all([
        prisma.dailySummaryCache
          .deleteMany({
            where: { userId, timezone, dayKey },
          })
          .catch(() => {}),
        prisma.dailySuggestionsCache
          .deleteMany({
            where: { userId, timezone, dayKey },
          })
          .catch(() => {}),
      ])
    )
  );
}

