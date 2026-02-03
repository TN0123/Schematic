import { PrismaClient, Prisma } from "@prisma/client";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";
import {
  aggregateAllTodos,
  formatTodosForPrompt,
} from "@/lib/todo-aggregation";
import { formatDueDate } from "@/app/bulletin/_components/utils/dateHelpers";
import {
  getExtendedMemoryContext,
  formatExtendedMemoryForPrompt,
  saveToMemory,
  updateUserProfileField,
  searchMemoriesBySemantic,
  UserProfile,
  MemorySearchResult,
} from "@/lib/memory";
import {
  getContextUsage,
  splitHistoryForSummarization,
  truncateHistory,
} from "@/lib/token-utils";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, CoreMessage, stepCountIs } from "ai";
import { z } from "zod";

// Define Zod schemas for tools
const getCalendarEventsSchema = z.object({
  startDate: z.string().describe("Start date in ISO 8601 format (YYYY-MM-DD)"),
  endDate: z.string().describe("End date in ISO 8601 format (YYYY-MM-DD)"),
});

const searchBulletinNotesSchema = z.object({
  query: z
    .string()
    .describe(
      "The search query to find relevant notes. Can be keywords, phrases, or topics to search for in note titles and content."
    ),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return (default: 5, max: 10)"),
});

const saveToMemorySchema = z.object({
  content: z
    .string()
    .describe(
      "The information to save. Be concise but include relevant context."
    ),
  memoryType: z
    .enum(["daily", "longterm"])
    .describe(
      "daily = today's events/notes (date-specific), longterm = durable facts that should persist (preferences, relationships, important info)"
    ),
});

const updateUserProfileSchema = z.object({
  category: z
    .enum(["preferences", "routines", "constraints", "workPatterns"])
    .describe(
      "The category of profile to update: preferences (wakeTime, workHours, focusTimePreference, meetingPreference), routines (morningRoutine, eveningRoutine), constraints (commute, familyObligations), workPatterns (wfhDays, officeLocation)"
    ),
  field: z
    .string()
    .describe(
      "The specific field within the category to update (e.g., 'wakeTime', 'morningRoutine', 'commute', 'wfhDays')"
    ),
  value: z
    .string()
    .describe(
      "The value to set for this field. For wfhDays, use comma-separated days like 'Monday, Friday'"
    ),
});

const searchMemoriesSchema = z.object({
  query: z
    .string()
    .describe(
      "What to search for in memories. Can be a question, topic, or keywords related to what you want to find."
    ),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return (default: 5, max: 10)"),
});

const prisma = new PrismaClient();

async function getCalendarEvents(
  userId: string,
  startDate: string,
  endDate: string,
  timezone?: string
) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error("Invalid date format provided.");
      return { error: "Invalid date format. Please use ISO 8601 format." };
    }

    // Use the timezone utility to get proper UTC boundaries for the user's timezone
    const userTimezone = timezone || "UTC";

    // Get UTC boundaries for start date in user's timezone
    const startBounds = getUtcDayBoundsForTimezone(start, userTimezone);

    // Get UTC boundaries for end date in user's timezone
    const endBounds = getUtcDayBoundsForTimezone(end, userTimezone);

    const events = await prisma.event.findMany({
      where: {
        userId,
        start: {
          lte: endBounds.endUtc,
        },
        end: {
          gte: startBounds.startUtc,
        },
      },
      select: { title: true, start: true, end: true },
    });

    return events;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return { error: "Failed to fetch calendar events." };
  }
}

// Helper function to extract searchable text from data field based on bulletin type
function extractSearchableTextFromData(data: any, type: string): string {
  if (!data) return "";

  const searchableTexts: string[] = [];

  try {
    switch (type) {
      case "todo":
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            if (item.text) {
              let itemText = item.text;

              // Add deadline information if available
              if (item.dueDate) {
                const dueDate = item.dueDate;
                const dueTime = item.dueTime;

                if (dueTime) {
                  // Format date and time together
                  const [hours, minutes] = dueTime.split(":").map(Number);
                  const date = new Date(dueDate);
                  date.setHours(hours, minutes, 0, 0);

                  // Create a readable deadline format
                  const dateStr = formatDueDate(dueDate);
                  const timeStr = date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  itemText += ` (due: ${dateStr} at ${timeStr})`;
                } else {
                  // Date only
                  const dateStr = formatDueDate(dueDate);
                  itemText += ` (due: ${dateStr})`;
                }
              }

              searchableTexts.push(itemText);
            }
          });
        }
        break;

      case "kanban":
        if (data.cards && Array.isArray(data.cards)) {
          data.cards.forEach((card: any) => {
            if (card.text) searchableTexts.push(card.text);
            if (card.description) searchableTexts.push(card.description);
            if (card.tags && Array.isArray(card.tags)) {
              searchableTexts.push(...card.tags);
            }
          });
        }
        break;

      case "dynamic":
        // Extract all string values from the dynamic data object
        const extractStrings = (obj: any): string[] => {
          const strings: string[] = [];
          if (typeof obj === "string") {
            strings.push(obj);
          } else if (Array.isArray(obj)) {
            obj.forEach((item) => strings.push(...extractStrings(item)));
          } else if (obj && typeof obj === "object") {
            Object.values(obj).forEach((value) =>
              strings.push(...extractStrings(value))
            );
          }
          return strings;
        };
        searchableTexts.push(...extractStrings(data));
        break;

      default:
        // For other types, don't extract anything from data
        break;
    }
  } catch (error) {
    console.error("Error extracting searchable text from data:", error);
  }

  return searchableTexts.join(" ");
}

async function searchBulletinNotes(
  userId: string,
  query: string,
  limit: number = 5
) {
  try {
    if (!query || query.trim().length === 0) {
      return { error: "Search query cannot be empty." };
    }

    const searchQuery = query.trim();
    const searchWords = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    // First, get all bulletins for the user (excluding whiteboards)
    const bulletins = await prisma.bulletin.findMany({
      where: {
        userId,
        type: {
          not: "whiteboard",
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        data: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Filter bulletins based on search query
    const matchingBulletins = bulletins.filter((bulletin) => {
      const titleMatch =
        bulletin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchWords.some((word) => bulletin.title.toLowerCase().includes(word));

      const contentMatch =
        bulletin.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchWords.some((word) =>
          bulletin.content.toLowerCase().includes(word)
        );

      // Extract searchable text from data field
      const dataSearchableText = extractSearchableTextFromData(
        bulletin.data,
        bulletin.type
      );
      const dataMatch =
        dataSearchableText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchWords.some((word) =>
          dataSearchableText.toLowerCase().includes(word)
        );

      return titleMatch || contentMatch || dataMatch;
    });

    // Limit results
    const limitedResults = matchingBulletins.slice(0, Math.min(limit, 10));

    // Format the results with content snippets
    const results = limitedResults.map((bulletin) => {
      let contentPreview = bulletin.content
        ? bulletin.content.substring(0, 200) +
          (bulletin.content.length > 200 ? "..." : "")
        : "";

      // Add data content preview for non-text types
      if (bulletin.type !== "text" && bulletin.data) {
        const dataText = extractSearchableTextFromData(
          bulletin.data,
          bulletin.type
        );
        if (dataText) {
          const dataPreview =
            dataText.substring(0, 100) + (dataText.length > 100 ? "..." : "");
          contentPreview = contentPreview
            ? `${contentPreview} | Data: ${dataPreview}`
            : `Data: ${dataPreview}`;
        }
      }

      return {
        id: bulletin.id,
        title: bulletin.title,
        content: contentPreview,
        type: bulletin.type,
        updatedAt: bulletin.updatedAt.toISOString(),
      };
    });

    return results;
  } catch (error) {
    console.error("Error searching bulletin notes:", error);
    return { error: "Failed to search bulletin notes." };
  }
}

export async function scheduleChat(
  instructions: string,
  history: any[],
  userId?: string,
  timezone?: string,
  goalsView?: "list" | "text" | "todo"
) {
  require("dotenv").config();

  let memoryContext = "";
  let goals: { title: string; type: string }[] = [];
  let goalsContext = "";
  let events: { title: string; start: Date; end: Date }[] = [];
  let assistantName = "AI Life Assistant";

  // Calculate dates in user's timezone
  const now = new Date();
  const userTimezone = timezone || "UTC";
  const userNow = new Date(
    now.toLocaleString("en-US", { timeZone: userTimezone })
  );
  const yesterdayInUserTz = new Date(userNow);
  yesterdayInUserTz.setDate(yesterdayInUserTz.getDate() - 1);
  const tomorrowInUserTz = new Date(userNow);
  tomorrowInUserTz.setDate(tomorrowInUserTz.getDate() + 1);

  if (userId && timezone) {
    try {
      // Load user settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { goalText: true, assistantName: true },
      });
      if (user) {
        if (user.assistantName) {
          assistantName = user.assistantName;
        }
      }

      // Load extended memory context with auto-fetched relevant content
      // This includes: daily memories, longterm memory, profile, keyword-matched bulletins, and relevant past memories
      const memory = await getExtendedMemoryContext(
        userId,
        userTimezone,
        instructions
      );
      memoryContext = formatExtendedMemoryForPrompt(memory);

      // Fetch goals context based on the selected view
      if (goalsView === "text" && user?.goalText) {
        goalsContext = `User's Goals (Free-form Text):\n${user.goalText}`;
      } else if (goalsView === "todo") {
        // Fetch and aggregate all todos from all todo bulletins
        const allTodos = await aggregateAllTodos(userId, 50); // Limit to 50 todos
        goalsContext = formatTodosForPrompt(allTodos);
      } else {
        // Default to list view (structured goals)
        goals = await prisma.goal.findMany({
          where: {
            userId,
          },
          select: { title: true, type: true },
        });
        goalsContext = `User's Goals:\n${goals
          .map((goal) => `- ${goal.title} (${goal.type} goal)`)
          .join("\n")}`;
      }

      // Use the timezone utility to get proper UTC boundaries for today in user's timezone
      const todayBounds = getUtcDayBoundsForTimezone(now, timezone);

      events = await prisma.event.findMany({
        where: {
          userId,
          start: {
            gte: now, // Get events from now onwards (remaining events)
          },
          end: {
            lte: todayBounds.endUtc, // But only within today
          },
        },
        select: { title: true, start: true, end: true },
      });
    } catch (e) {
      console.error("Could not find user to get schedule context");
    }
  }

  // Sanitize assistant name for prompt injection prevention
  const sanitizedAssistantName = assistantName
    .replace(/["'`\\]/g, "") // Remove quotes and backslashes
    .replace(/[\r\n\t]/g, " ") // Replace newlines and tabs with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();

  const systemPrompt = `
You are ${sanitizedAssistantName}, ${
    userId ? "the user's" : "a"
  } personal life assistant helping ${
    userId ? "them" : "users"
  } manage their schedule and providing helpful advice.
Current date: ${now.toLocaleString("en-US", {
    timeZone: timezone || "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  })}.

${goalsContext || "User has not set any goals."}

Today's remaining events:
${events
  .map((event) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: timezone,
    };
    const start = new Date(event.start).toLocaleTimeString("en-US", options);
    const end = new Date(event.end).toLocaleTimeString("en-US", options);
    return `- ${event.title}: ${start} - ${end}`;
  })
  .join("\n")}

FUNCTION CALLING RULES:
- If user mentions "yesterday" → call get_calendar_events with startDate and endDate both set to ${
    yesterdayInUserTz.toISOString().split("T")[0]
  }
- If user mentions "tomorrow" → call get_calendar_events with tomorrow's date  
- If user mentions any specific date → call get_calendar_events with that date
- If you need more context from the user's notes, ideas, or written content → call search_bulletin_notes with a relevant search query
- DO NOT say "I need to retrieve" - just call the function immediately

BULLETIN NOTES SEARCH:
- The user has a bulletin where they keep notes, ideas, and various content
- You can search through these notes by title or content using the search_bulletin_notes function
- Use this when the user asks about something that might be documented in their notes
- Use this when you need additional context about the user's life, projects, or ideas
- Examples: user asks "what did I write about project X?", "do I have notes about Y?", "remind me what I said about Z"

Today: ${userNow.toISOString().split("T")[0]}
Yesterday: ${yesterdayInUserTz.toISOString().split("T")[0]}

USER MEMORY & CONTEXT:
${memoryContext}

MEMORY MANAGEMENT RULES:
You have access to a multi-layer memory system to remember information about the user:

1. DAILY MEMORY (save_to_memory with memoryType="daily"):
   - Use for things that happened today
   - Events, conversations, decisions made today
   - Temporary notes that are date-specific
   - Examples: "Had a great meeting with Sarah about the project", "Decided to push the deadline to Friday"

2. LONG-TERM MEMORY (save_to_memory with memoryType="longterm"):
   - Use for durable facts that should persist over time
   - Important preferences, life facts, relationships
   - Things the user wants you to remember permanently
   - Examples: "User's mother's name is Maria", "User is allergic to shellfish", "User prefers to work on creative tasks in the morning"

3. USER PROFILE (update_user_profile):
   - Use for structured preferences and routines
   - Categories: preferences, routines, constraints, workPatterns
   - Examples: wake time, work hours, commute time, WFH days

WHEN TO SAVE MEMORIES:
- When user explicitly says "remember this" or "don't forget"
- When user shares personal information, preferences, or habits
- When important decisions or events are mentioned
- When user shares constraints or obligations

CRITICAL: You MUST ALWAYS respond with valid JSON format. Never respond with plain text.

WORKFLOW:
1. If user asks about non-today dates: First call get_calendar_events function
2. If user shares information to remember: Call save_to_memory or update_user_profile
3. After getting function results: Return JSON response with the information
4. If no function call needed: Return JSON response directly

REQUIRED JSON FORMAT (this is mandatory - never deviate from this format):
{
  "response": "your conversational response to the user. Whenever you mention times use 12 hour format"
}

EXAMPLES OF CORRECT RESPONSES:
{
  "response": "I see you have a meeting at 2:00 PM today. That sounds important!"
}

{
  "response": "I'll remember that you prefer morning workouts. That's great for starting your day energized!"
}

IMPORTANT: 
- Always wrap your response in the JSON structure above
- Use proper JSON syntax with double quotes
- Escape any quotes within strings
- Never include markdown code blocks or additional text outside the JSON
- Always speak to the user in a friendly, engaging, and conversational tone
- Use the memory tools to save information instead of including contextUpdate in your response
`;
  const userPrompt = instructions;

  // Track tool calls for UI display
  const toolCallsExecuted: Array<{
    name: string;
    description: string;
    notes?: Array<{
      id: string;
      title: string;
      type?: string;
    }>;
  }> = [];

  // Define tools using Vercel AI SDK format with Zod schemas
  const tools = {
    get_calendar_events: tool({
      description:
        "Get calendar events for a specific date or date range. Use this when user asks about their schedule for any day other than today.",
      inputSchema: getCalendarEventsSchema,
      execute: async ({ startDate, endDate }) => {
        if (!userId) return { error: "User not authenticated" };

        const toolResult = await getCalendarEvents(
          userId,
          startDate,
          endDate,
          timezone
        );

        // Track this tool call for UI display
        const startDateFormatted = new Date(
          startDate + "T12:00:00"
        ).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          timeZone: timezone,
        });
        const endDateFormatted = new Date(
          endDate + "T12:00:00"
        ).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          timeZone: timezone,
        });

        let description = `Read events from ${startDateFormatted}`;
        if (startDate !== endDate) {
          description = `Read events from ${startDateFormatted} - ${endDateFormatted}`;
        }

        toolCallsExecuted.push({
          name: "get_calendar_events",
          description,
        });

        return toolResult;
      },
    }),
    search_bulletin_notes: tool({
      description:
        "Search through the user's bulletin notes by title or content. Use this when you need to find specific information from the user's notes, ideas, or written content. The search will look through all their bulletin items and return relevant matches.",
      inputSchema: searchBulletinNotesSchema,
      execute: async ({ query, limit }) => {
        if (!userId) return { error: "User not authenticated" };

        const toolResult = await searchBulletinNotes(userId, query, limit || 5);

        // Track this tool call for UI display
        toolCallsExecuted.push({
          name: "search_bulletin_notes",
          description: `Searched notes for "${query}"`,
          notes: Array.isArray(toolResult)
            ? toolResult.map((note) => ({
                id: note.id || note.title,
                title: note.title,
                type: note.type,
              }))
            : [],
        });

        return toolResult;
      },
    }),
    save_to_memory: tool({
      description:
        "Save important information to the user's memory. Use this when the user shares something they want you to remember, or when they mention important facts, preferences, or events. Daily memories are for today's events; longterm memories persist indefinitely.",
      inputSchema: saveToMemorySchema,
      execute: async ({ content, memoryType }) => {
        if (!userId || !timezone)
          return { success: false, error: "User not authenticated" };

        try {
          await saveToMemory(userId, content, memoryType, timezone);

          // Track this tool call for UI display
          toolCallsExecuted.push({
            name: "save_to_memory",
            description: `Saved to ${memoryType} memory: "${content.substring(
              0,
              50
            )}${content.length > 50 ? "..." : ""}"`,
          });

          return {
            success: true,
            message: `Memory saved successfully to ${memoryType} memory`,
          };
        } catch (error) {
          console.error("Error in save_to_memory:", error);
          return { success: false, error: "Failed to save memory" };
        }
      },
    }),
    update_user_profile: tool({
      description:
        "Update a specific field in the user's structured profile. Use this for preferences, routines, constraints, and work patterns. This creates structured data that helps personalize the assistant.",
      inputSchema: updateUserProfileSchema,
      execute: async ({ category, field, value }) => {
        if (!userId) return { success: false, error: "User not authenticated" };

        try {
          // Handle wfhDays as an array
          const processedValue =
            field === "wfhDays"
              ? value.split(",").map((d: string) => d.trim())
              : value;

          await updateUserProfileField(
            userId,
            category as keyof UserProfile,
            field,
            processedValue
          );

          // Track this tool call for UI display
          toolCallsExecuted.push({
            name: "update_user_profile",
            description: `Updated profile: ${category}.${field} = "${value}"`,
          });

          return {
            success: true,
            message: `Profile updated successfully: ${category}.${field}`,
          };
        } catch (error) {
          console.error("Error in update_user_profile:", error);
          return { success: false, error: "Failed to update profile" };
        }
      },
    }),
    search_memories: tool({
      description:
        "Search through the user's saved memories semantically. Use this when you need to recall past conversations, facts, or information that was previously saved. This performs a deep search through all memories using AI similarity matching.",
      inputSchema: searchMemoriesSchema,
      execute: async ({ query, limit }) => {
        if (!userId) return { success: false, error: "User not authenticated" };

        try {
          // Use semantic search to find relevant memories
          const searchResults = await searchMemoriesBySemantic(
            userId,
            query,
            Math.min(limit || 5, 10)
          );

          // Format results for the model
          const formattedResults = searchResults.map(
            (m: MemorySearchResult) => ({
              type: m.type,
              date: m.date
                ? new Date(m.date).toLocaleDateString()
                : "Long-term",
              content:
                m.content.length > 300
                  ? m.content.substring(0, 300) + "..."
                  : m.content,
              relevanceScore: Math.round(m.score * 100) / 100,
            })
          );

          // Track this tool call for UI display
          toolCallsExecuted.push({
            name: "search_memories",
            description: `Searched memories for "${query}" - found ${searchResults.length} results`,
          });

          return {
            success: true,
            query,
            resultsCount: searchResults.length,
            memories: formattedResults,
          };
        } catch (error) {
          console.error("Error in search_memories:", error);
          return { success: false, error: "Failed to search memories" };
        }
      },
    }),
  };

  // ==========================================================================
  // PRE-COMPACTION FLUSH: Check context size and summarize if approaching limit
  // ==========================================================================
  let processedHistory = history;
  let preCompactionSummary: string | null = null;

  if (userId && timezone) {
    const contextUsage = getContextUsage(systemPrompt, history, userPrompt);

    if (
      contextUsage.recommendedAction === "summarize" ||
      contextUsage.recommendedAction === "truncate"
    ) {
      console.log(
        `Pre-compaction triggered: ${contextUsage.percentageUsed.toFixed(
          1
        )}% context used`
      );

      // Split history into parts: older messages to summarize, recent messages to keep
      const { toSummarize, toKeep } = splitHistoryForSummarization(
        history,
        20000
      );

      if (toSummarize.length > 0) {
        try {
          // Use a lightweight model call to extract important points
          const extractionPrompt = `
You are analyzing a conversation to extract important information that should be remembered.

CONVERSATION TO ANALYZE:
${toSummarize.map((m) => `${m.role}: ${m.content}`).join("\n\n")}

Extract the following and return as JSON:
{
  "dailyFacts": ["facts specific to today's events or decisions"],
  "longtermFacts": ["durable facts about the user that should be remembered permanently"],
  "summary": "A brief 1-2 sentence summary of what was discussed"
}

Only include meaningful facts, not trivial conversation. Return valid JSON only.`;

          const extractionResult = await generateText({
            model: openai("gpt-5-mini"),
            prompt: extractionPrompt,
            temperature: 0,
          });
          const extractionText = extractionResult.text;

          // Parse the extraction result
          try {
            const cleanedText = extractionText
              .replace(/^```json\s*/, "")
              .replace(/\s*```$/, "")
              .trim();
            const extracted = JSON.parse(cleanedText);

            // Save daily facts
            if (extracted.dailyFacts && extracted.dailyFacts.length > 0) {
              const dailyContent = extracted.dailyFacts.join("\n• ");
              await saveToMemory(
                userId,
                `Pre-compaction summary:\n• ${dailyContent}`,
                "daily",
                timezone
              );
            }

            // Save longterm facts
            if (extracted.longtermFacts && extracted.longtermFacts.length > 0) {
              const longtermContent = extracted.longtermFacts.join("\n• ");
              await saveToMemory(
                userId,
                `From conversation:\n• ${longtermContent}`,
                "longterm",
                timezone
              );
            }

            preCompactionSummary = extracted.summary || null;
            console.log(
              `Pre-compaction: Saved ${
                extracted.dailyFacts?.length || 0
              } daily facts, ${
                extracted.longtermFacts?.length || 0
              } longterm facts`
            );
          } catch (parseError) {
            console.error("Failed to parse extraction result:", parseError);
          }
        } catch (extractError) {
          console.error("Pre-compaction extraction failed:", extractError);
        }

        // Use only the recent history
        processedHistory = toKeep;

        // If we have a summary, prepend it to give context
        if (preCompactionSummary && processedHistory.length > 0) {
          processedHistory = [
            {
              role: "user",
              content: `[Earlier conversation summary: ${preCompactionSummary}]`,
            },
            ...processedHistory,
          ];
        }
      }
    } else if (contextUsage.recommendedAction === "none") {
      // If still too large, just truncate
      processedHistory = truncateHistory(history, 50000);
      console.log(
        `Truncated history from ${history.length} to ${processedHistory.length} messages`
      );
    }
  }
  // ==========================================================================

  // Convert history to AI SDK CoreMessage format
  const messages: CoreMessage[] = processedHistory.map(
    (entry: { role: string; content: string }) => ({
      role: entry.role as "user" | "assistant",
      content: entry.content,
    })
  );

  // Add the current user prompt
  messages.push({
    role: "user",
    content: userPrompt,
  });

  // Use generateText with tools and stopWhen for automatic tool execution
  const result = await generateText({
    model: openai("gpt-5-mini"),
    system: systemPrompt,
    messages,
    tools,
    stopWhen: stepCountIs(10), // Allow up to 10 tool call iterations
    temperature: 0,
  });

  const responseText = result.text;

  if (!responseText || responseText.trim() === "") {
    console.error("Empty response text received");
    return {
      response: "I apologize, but I couldn't process your request properly.",
      contextUpdated: false,
    };
  }

  let response;
  try {
    // Strip markdown code blocks if present
    let cleanedResponseText = responseText
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    // If the response doesn't start with '{', try to extract JSON from the text
    if (!cleanedResponseText.startsWith("{")) {
      const jsonMatch = cleanedResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponseText = jsonMatch[0];
      } else {
        // If no JSON found, create a fallback response
        console.warn("No JSON found in response, creating fallback");
        cleanedResponseText = JSON.stringify({
          response:
            cleanedResponseText ||
            "I apologize, but I encountered an error processing your request.",
          contextUpdate: null,
        });
      }
    }

    response = JSON.parse(cleanedResponseText);

    // Validate the response structure
    if (!response.response || typeof response.response !== "string") {
      throw new Error(
        "Invalid response structure - missing or invalid 'response' field"
      );
    }
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Original response text:", responseText);

    // Create a safe fallback response
    response = {
      response:
        "I apologize, but I encountered an error processing your request. Please try again.",
    };
  }

  // Check if any memory-related tool calls were executed
  const memoryUpdated = toolCallsExecuted.some(
    (tc) => tc.name === "save_to_memory" || tc.name === "update_user_profile"
  );

  return {
    response: response.response,
    contextUpdated: memoryUpdated,
    toolCalls: toolCallsExecuted,
  };
}
