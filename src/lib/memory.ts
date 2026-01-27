import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Types for the memory system
export interface UserProfile {
  preferences: {
    wakeTime?: string;
    workHours?: string;
    focusTimePreference?: string;
    meetingPreference?: string;
  };
  routines: {
    morningRoutine?: string;
    eveningRoutine?: string;
  };
  constraints: {
    commute?: string;
    familyObligations?: string;
  };
  workPatterns: {
    wfhDays?: string[];
    officeLocation?: string;
  };
}

export interface MemoryContext {
  daily: string | null; // Today's daily memory
  yesterdayDaily: string | null; // Yesterday's daily memory
  longterm: string | null; // Curated long-term memory
  profile: UserProfile | null; // Structured user profile
}

/**
 * Get the start of day in a specific timezone as a Date object
 * This normalizes dates so we can have one memory entry per calendar day
 */
function getDateKeyForTimezone(date: Date, timezone: string): Date {
  // Get the date string in the user's timezone (YYYY-MM-DD format)
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: timezone });
  // Create a Date object for midnight UTC on that date
  // We use UTC midnight as the canonical representation for "this calendar day"
  return new Date(dateStr + "T00:00:00.000Z");
}

/**
 * Get today's daily memory for a user
 */
export async function getDailyMemory(
  userId: string,
  timezone: string,
  date?: Date
): Promise<string | null> {
  const targetDate = date || new Date();
  const dateKey = getDateKeyForTimezone(targetDate, timezone);

  const memory = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "daily",
      date: dateKey,
    },
  });

  return memory?.content || null;
}

/**
 * Append content to today's daily memory
 * If no memory exists for today, create one
 */
export async function appendToDailyMemory(
  userId: string,
  content: string,
  timezone: string
): Promise<void> {
  const dateKey = getDateKeyForTimezone(new Date(), timezone);

  const existing = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "daily",
      date: dateKey,
    },
  });

  if (existing) {
    // Append to existing daily memory
    const timestamp = new Date().toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const newContent = `${existing.content}\n\n[${timestamp}] ${content}`;
    
    await prisma.userMemory.update({
      where: { id: existing.id },
      data: { content: newContent },
    });
  } else {
    // Create new daily memory
    const timestamp = new Date().toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    await prisma.userMemory.create({
      data: {
        userId,
        type: "daily",
        date: dateKey,
        content: `[${timestamp}] ${content}`,
      },
    });
  }
}

/**
 * Get the user's long-term memory
 */
export async function getLongtermMemory(userId: string): Promise<string | null> {
  const memory = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "longterm",
      date: null, // longterm memories don't have a date
    },
  });

  return memory?.content || null;
}

/**
 * Update or create the user's long-term memory
 */
export async function updateLongtermMemory(
  userId: string,
  content: string
): Promise<void> {
  const existing = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "longterm",
      date: null,
    },
  });

  if (existing) {
    await prisma.userMemory.update({
      where: { id: existing.id },
      data: { content },
    });
  } else {
    await prisma.userMemory.create({
      data: {
        userId,
        type: "longterm",
        date: null,
        content,
      },
    });
  }
}

/**
 * Get the user's structured profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const memory = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "profile",
      date: null,
    },
  });

  if (!memory?.metadata) {
    return null;
  }

  return memory.metadata as UserProfile;
}

/**
 * Update a specific field in the user's profile
 */
export async function updateUserProfileField(
  userId: string,
  category: keyof UserProfile,
  field: string,
  value: string | string[]
): Promise<void> {
  const existing = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "profile",
      date: null,
    },
  });

  const currentProfile: UserProfile = (existing?.metadata as UserProfile) || {
    preferences: {},
    routines: {},
    constraints: {},
    workPatterns: {},
  };

  // Update the specific field in the category
  if (!currentProfile[category]) {
    currentProfile[category] = {} as any;
  }
  (currentProfile[category] as any)[field] = value;

  // Generate a human-readable content summary of the profile
  const contentSummary = formatProfileAsContent(currentProfile);

  if (existing) {
    await prisma.userMemory.update({
      where: { id: existing.id },
      data: {
        metadata: currentProfile as any,
        content: contentSummary,
      },
    });
  } else {
    await prisma.userMemory.create({
      data: {
        userId,
        type: "profile",
        date: null,
        metadata: currentProfile as any,
        content: contentSummary,
      },
    });
  }
}

/**
 * Format the profile as human-readable content
 */
function formatProfileAsContent(profile: UserProfile): string {
  const lines: string[] = [];

  if (profile.preferences) {
    const prefs = profile.preferences;
    if (prefs.wakeTime) lines.push(`Wake time: ${prefs.wakeTime}`);
    if (prefs.workHours) lines.push(`Work hours: ${prefs.workHours}`);
    if (prefs.focusTimePreference) lines.push(`Focus time preference: ${prefs.focusTimePreference}`);
    if (prefs.meetingPreference) lines.push(`Meeting preference: ${prefs.meetingPreference}`);
  }

  if (profile.routines) {
    const routines = profile.routines;
    if (routines.morningRoutine) lines.push(`Morning routine: ${routines.morningRoutine}`);
    if (routines.eveningRoutine) lines.push(`Evening routine: ${routines.eveningRoutine}`);
  }

  if (profile.constraints) {
    const constraints = profile.constraints;
    if (constraints.commute) lines.push(`Commute: ${constraints.commute}`);
    if (constraints.familyObligations) lines.push(`Family obligations: ${constraints.familyObligations}`);
  }

  if (profile.workPatterns) {
    const work = profile.workPatterns;
    if (work.wfhDays && work.wfhDays.length > 0) {
      lines.push(`Work from home days: ${work.wfhDays.join(", ")}`);
    }
    if (work.officeLocation) lines.push(`Office location: ${work.officeLocation}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No profile information yet.";
}

/**
 * Get the full memory context for the AI prompt
 * This is the main function used by the chat system
 */
export async function getMemoryContext(
  userId: string,
  timezone: string
): Promise<MemoryContext> {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const [daily, yesterdayDaily, longterm, profile] = await Promise.all([
    getDailyMemory(userId, timezone, now),
    getDailyMemory(userId, timezone, yesterday),
    getLongtermMemory(userId),
    getUserProfile(userId),
  ]);

  return {
    daily,
    yesterdayDaily,
    longterm,
    profile,
  };
}

/**
 * Format memory context for inclusion in the AI system prompt
 */
export function formatMemoryForPrompt(memory: MemoryContext): string {
  const sections: string[] = [];

  // Profile section (structured information)
  if (memory.profile) {
    const profileContent = formatProfileAsContent(memory.profile);
    if (profileContent && profileContent !== "No profile information yet.") {
      sections.push(`USER PROFILE:\n${profileContent}`);
    }
  }

  // Long-term memory section
  if (memory.longterm) {
    sections.push(`LONG-TERM MEMORY (curated important facts):\n${memory.longterm}`);
  }

  // Daily memories section
  const dailyMemories: string[] = [];
  if (memory.yesterdayDaily) {
    dailyMemories.push(`Yesterday's notes:\n${memory.yesterdayDaily}`);
  }
  if (memory.daily) {
    dailyMemories.push(`Today's notes:\n${memory.daily}`);
  }
  if (dailyMemories.length > 0) {
    sections.push(`RECENT DAILY MEMORIES:\n${dailyMemories.join("\n\n")}`);
  }

  if (sections.length === 0) {
    return "No user context available yet. The assistant will learn about the user over time.";
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Save to memory (used by the AI tool)
 */
export async function saveToMemory(
  userId: string,
  content: string,
  memoryType: "daily" | "longterm",
  timezone: string
): Promise<void> {
  if (memoryType === "daily") {
    await appendToDailyMemory(userId, content, timezone);
  } else {
    // For longterm, we append to existing content rather than replace
    const existing = await getLongtermMemory(userId);
    const newContent = existing 
      ? `${existing}\n\n${content}`
      : content;
    await updateLongtermMemory(userId, newContent);
  }
}
