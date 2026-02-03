import { PrismaClient } from "@prisma/client";
import {
  extractKeywords,
  containsKeywords,
  generateEmbedding,
  cosineSimilarity,
} from "./embeddings";

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
  date?: Date,
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
  timezone: string,
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
export async function getLongtermMemory(
  userId: string,
): Promise<string | null> {
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
  content: string,
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
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
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

  return memory.metadata as unknown as UserProfile;
}

/**
 * Update a specific field in the user's profile
 */
export async function updateUserProfileField(
  userId: string,
  category: keyof UserProfile,
  field: string,
  value: string | string[],
): Promise<void> {
  const existing = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "profile",
      date: null,
    },
  });

  const currentProfile: UserProfile =
    (existing?.metadata as unknown as UserProfile) || {
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
    if (prefs.focusTimePreference)
      lines.push(`Focus time preference: ${prefs.focusTimePreference}`);
    if (prefs.meetingPreference)
      lines.push(`Meeting preference: ${prefs.meetingPreference}`);
  }

  if (profile.routines) {
    const routines = profile.routines;
    if (routines.morningRoutine)
      lines.push(`Morning routine: ${routines.morningRoutine}`);
    if (routines.eveningRoutine)
      lines.push(`Evening routine: ${routines.eveningRoutine}`);
  }

  if (profile.constraints) {
    const constraints = profile.constraints;
    if (constraints.commute) lines.push(`Commute: ${constraints.commute}`);
    if (constraints.familyObligations)
      lines.push(`Family obligations: ${constraints.familyObligations}`);
  }

  if (profile.workPatterns) {
    const work = profile.workPatterns;
    if (work.wfhDays && work.wfhDays.length > 0) {
      lines.push(`Work from home days: ${work.wfhDays.join(", ")}`);
    }
    if (work.officeLocation)
      lines.push(`Office location: ${work.officeLocation}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No profile information yet.";
}

/**
 * Get the full memory context for the AI prompt
 * This is the main function used by the chat system
 */
export async function getMemoryContext(
  userId: string,
  timezone: string,
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
    sections.push(
      `LONG-TERM MEMORY (curated important facts):\n${memory.longterm}`,
    );
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
 * Now also extracts and stores keywords for fast searching
 */
export async function saveToMemory(
  userId: string,
  content: string,
  memoryType: "daily" | "longterm",
  timezone: string,
): Promise<void> {
  // Extract keywords from the content for fast searching
  const keywords = extractKeywords(content, 15);

  if (memoryType === "daily") {
    await appendToDailyMemoryWithKeywords(userId, content, timezone, keywords);
  } else {
    // For longterm, we append to existing content rather than replace
    const existing = await getLongtermMemory(userId);
    const newContent = existing ? `${existing}\n\n${content}` : content;
    await updateLongtermMemoryWithKeywords(userId, newContent, keywords);
  }
}

/**
 * Append to daily memory with keywords
 */
async function appendToDailyMemoryWithKeywords(
  userId: string,
  content: string,
  timezone: string,
  newKeywords: string[],
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
    const timestamp = new Date().toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const newContent = `${existing.content}\n\n[${timestamp}] ${content}`;

    // Merge existing keywords with new ones
    const existingKeywords = (existing.keywords as string[]) || [];
    const mergedKeywords = Array.from(
      new Set([...existingKeywords, ...newKeywords]),
    ).slice(0, 30);

    await prisma.userMemory.update({
      where: { id: existing.id },
      data: {
        content: newContent,
        keywords: mergedKeywords,
        embedding: null, // Invalidate embedding when content changes
      },
    });
  } else {
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
        keywords: newKeywords,
      },
    });
  }
}

/**
 * Update longterm memory with keywords
 */
async function updateLongtermMemoryWithKeywords(
  userId: string,
  content: string,
  newKeywords: string[],
): Promise<void> {
  const existing = await prisma.userMemory.findFirst({
    where: {
      userId,
      type: "longterm",
      date: null,
    },
  });

  // For longterm, extract keywords from entire content
  const allKeywords = extractKeywords(content, 30);

  if (existing) {
    await prisma.userMemory.update({
      where: { id: existing.id },
      data: {
        content,
        keywords: allKeywords,
        embedding: null, // Invalidate embedding when content changes
      },
    });
  } else {
    await prisma.userMemory.create({
      data: {
        userId,
        type: "longterm",
        date: null,
        content,
        keywords: allKeywords,
      },
    });
  }
}

// =============================================================================
// SEARCH FUNCTIONS
// =============================================================================

export interface MemorySearchResult {
  id: string;
  type: string;
  content: string;
  date: Date | null;
  score: number;
  matchedKeywords?: string[];
}

/**
 * Search memories by keywords (fast, no API calls)
 * This is used for auto-fetch - lightweight and free
 */
export async function searchMemoriesByKeywords(
  userId: string,
  queryKeywords: string[],
  limit: number = 5,
): Promise<MemorySearchResult[]> {
  if (queryKeywords.length === 0) {
    return [];
  }

  // Get all memories for the user
  const memories = await prisma.userMemory.findMany({
    where: {
      userId,
      type: { in: ["daily", "longterm"] }, // Don't search profile
    },
    orderBy: { updatedAt: "desc" },
    take: 100, // Limit to recent memories for performance
  });

  // Score each memory by keyword match
  const results: MemorySearchResult[] = [];

  for (const memory of memories) {
    const memoryKeywords = (memory.keywords as string[]) || [];

    // Check for keyword overlap
    const { matches, matchedKeywords } = containsKeywords(
      memory.content,
      queryKeywords,
    );

    // Also check stored keywords
    const keywordOverlap = queryKeywords.filter((kw) =>
      memoryKeywords.some((mk) => mk.toLowerCase().includes(kw.toLowerCase())),
    );

    const allMatchedKeywords = Array.from(
      new Set([...matchedKeywords, ...keywordOverlap]),
    );

    if (allMatchedKeywords.length > 0) {
      const score = allMatchedKeywords.length / queryKeywords.length;
      results.push({
        id: memory.id,
        type: memory.type,
        content: memory.content,
        date: memory.date,
        score,
        matchedKeywords: allMatchedKeywords,
      });
    }
  }

  // Sort by score and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Search memories semantically using embeddings (expensive, on-demand only)
 * This is used for the explicit search_memories tool
 */
export async function searchMemoriesBySemantic(
  userId: string,
  query: string,
  limit: number = 5,
  similarityThreshold: number = 0.7,
): Promise<MemorySearchResult[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Get all memories for the user
  const memories = await prisma.userMemory.findMany({
    where: {
      userId,
      type: { in: ["daily", "longterm"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  // For each memory, compute embedding if missing, then calculate similarity
  const results: MemorySearchResult[] = [];

  for (const memory of memories) {
    let embedding = memory.embedding as number[] | null;

    // Lazy compute embedding if not present
    if (!embedding) {
      try {
        embedding = await generateEmbedding(memory.content);
        // Cache the embedding
        await prisma.userMemory.update({
          where: { id: memory.id },
          data: { embedding: embedding as any },
        });
      } catch (error) {
        console.error(
          `Failed to generate embedding for memory ${memory.id}:`,
          error,
        );
        continue;
      }
    }

    // Calculate similarity
    const similarity = cosineSimilarity(queryEmbedding, embedding);

    if (similarity >= similarityThreshold) {
      results.push({
        id: memory.id,
        type: memory.type,
        content: memory.content,
        date: memory.date,
        score: similarity,
      });
    }
  }

  // Sort by similarity and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Get relevant memories based on user message keywords
 * This is the auto-fetch function - lightweight and used on every message
 */
export async function getRelevantMemories(
  userId: string,
  userMessage: string,
  limit: number = 3,
): Promise<MemorySearchResult[]> {
  // Extract keywords from the user message
  const keywords = extractKeywords(userMessage, 10);

  if (keywords.length === 0) {
    return [];
  }

  // Use keyword search (fast, no API calls)
  return searchMemoriesByKeywords(userId, keywords, limit);
}

// =============================================================================
// BULLETIN INTEGRATION (Cross-source)
// =============================================================================

export interface BulletinSnippet {
  id: string;
  title: string;
  type: string;
  snippet: string;
  relevanceScore: number;
}

/**
 * Helper function to extract searchable text from bulletin data field
 */
function extractSearchableTextFromData(data: any, type: string): string {
  if (!data) return "";

  const searchableTexts: string[] = [];

  try {
    switch (type) {
      case "todo":
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            if (item.text) {
              searchableTexts.push(item.text);
            }
          });
        }
        break;

      case "kanban":
        if (data.cards && Array.isArray(data.cards)) {
          data.cards.forEach((card: any) => {
            if (card.text) searchableTexts.push(card.text);
            if (card.description) searchableTexts.push(card.description);
          });
        }
        break;

      case "dynamic":
        const extractStrings = (obj: any): string[] => {
          const strings: string[] = [];
          if (typeof obj === "string") {
            strings.push(obj);
          } else if (Array.isArray(obj)) {
            obj.forEach((item) => strings.push(...extractStrings(item)));
          } else if (obj && typeof obj === "object") {
            Object.values(obj).forEach((value) =>
              strings.push(...extractStrings(value)),
            );
          }
          return strings;
        };
        searchableTexts.push(...extractStrings(data));
        break;

      default:
        break;
    }
  } catch (error) {
    console.error("Error extracting searchable text from data:", error);
  }

  return searchableTexts.join(" ");
}

/**
 * Get relevant bulletin snippets based on user message keywords
 * This is a lightweight search that doesn't use embeddings
 */
export async function getRelevantBulletinSnippets(
  userId: string,
  userMessage: string,
  limit: number = 3,
  maxSnippetLength: number = 200,
): Promise<BulletinSnippet[]> {
  // Extract keywords from the user message
  const keywords = extractKeywords(userMessage, 10);

  if (keywords.length === 0) {
    return [];
  }

  // Get recent bulletins (excluding whiteboards)
  const bulletins = await prisma.bulletin.findMany({
    where: {
      userId,
      type: { not: "whiteboard" },
    },
    orderBy: { updatedAt: "desc" },
    take: 50, // Check recent bulletins
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      data: true,
    },
  });

  // Score each bulletin by keyword match
  const results: BulletinSnippet[] = [];

  for (const bulletin of bulletins) {
    // Combine title, content, and data text for searching
    const dataText = extractSearchableTextFromData(bulletin.data, bulletin.type);
    const fullText = `${bulletin.title} ${bulletin.content} ${dataText}`;

    // Check for keyword matches
    const { matches, matchedKeywords } = containsKeywords(fullText, keywords);

    if (matches) {
      const relevanceScore = matchedKeywords.length / keywords.length;

      // Create a snippet from the content
      let snippet = bulletin.content || dataText || "";
      if (snippet.length > maxSnippetLength) {
        snippet = snippet.substring(0, maxSnippetLength) + "...";
      }

      results.push({
        id: bulletin.id,
        title: bulletin.title,
        type: bulletin.type,
        snippet,
        relevanceScore,
      });
    }
  }

  // Sort by relevance and return top results
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}

/**
 * Format bulletin snippets for inclusion in the prompt
 */
export function formatBulletinSnippets(snippets: BulletinSnippet[]): string {
  if (snippets.length === 0) {
    return "";
  }

  return snippets
    .map(
      (s) =>
        `• ${s.title} (${s.type}): ${s.snippet}`,
    )
    .join("\n");
}

/**
 * Extended memory context that includes bulletin snippets
 */
export interface ExtendedMemoryContext extends MemoryContext {
  bulletinSnippets: BulletinSnippet[];
  relevantMemories: MemorySearchResult[];
}

/**
 * Get extended memory context with auto-fetched relevant content
 * This combines daily/longterm memory with keyword-matched content
 */
export async function getExtendedMemoryContext(
  userId: string,
  timezone: string,
  userMessage?: string,
): Promise<ExtendedMemoryContext> {
  // Get base memory context
  const baseContext = await getMemoryContext(userId, timezone);

  // If no user message, return base context with empty extras
  if (!userMessage) {
    return {
      ...baseContext,
      bulletinSnippets: [],
      relevantMemories: [],
    };
  }

  // Fetch relevant content based on user message keywords
  const [bulletinSnippets, relevantMemories] = await Promise.all([
    getRelevantBulletinSnippets(userId, userMessage, 3, 200),
    getRelevantMemories(userId, userMessage, 3),
  ]);

  return {
    ...baseContext,
    bulletinSnippets,
    relevantMemories,
  };
}

/**
 * Format extended memory context for inclusion in the AI system prompt
 */
export function formatExtendedMemoryForPrompt(
  memory: ExtendedMemoryContext,
): string {
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
    sections.push(
      `LONG-TERM MEMORY (curated important facts):\n${memory.longterm}`,
    );
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

  // Relevant memories from keyword search (auto-fetch)
  if (memory.relevantMemories.length > 0) {
    const relevantContent = memory.relevantMemories
      .map((m) => {
        const dateStr = m.date
          ? new Date(m.date).toLocaleDateString()
          : "Long-term";
        const snippet =
          m.content.length > 150
            ? m.content.substring(0, 150) + "..."
            : m.content;
        return `• [${dateStr}] ${snippet}`;
      })
      .join("\n");
    sections.push(`RELEVANT PAST MEMORIES:\n${relevantContent}`);
  }

  // Bulletin snippets (cross-source integration)
  if (memory.bulletinSnippets.length > 0) {
    const bulletinContent = formatBulletinSnippets(memory.bulletinSnippets);
    sections.push(`RELEVANT NOTES FROM BULLETINS:\n${bulletinContent}`);
  }

  if (sections.length === 0) {
    return "No user context available yet. The assistant will learn about the user over time.";
  }

  return sections.join("\n\n---\n\n");
}
