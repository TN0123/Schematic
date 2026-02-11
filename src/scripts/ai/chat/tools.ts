import { tool } from "ai";
import prisma from "@/lib/prisma";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";
import {
  MemorySearchResult,
  searchMemoriesBySemantic,
  saveToMemory,
  updateUserProfileField,
  UserProfile,
} from "@/lib/memory";
import { generate_events } from "@/scripts/ai/generate-events";
import { recordEventActionsBatch } from "@/lib/habit-ingestion";
import { invalidateAllUserCaches } from "@/lib/cache-utils";
import { pushEventToGoogle } from "@/lib/google-calendar-sync";
import { searchBulletinNotes } from "@/scripts/ai/chat/bulletin-search";
import {
  generateCalendarEventsSchema,
  getCalendarEventsSchema,
  saveToMemorySchema,
  searchBulletinNotesSchema,
  searchMemoriesSchema,
  updateUserProfileSchema,
} from "@/scripts/ai/chat/schemas";
import type {
  ToolCallHandler,
  ToolCallUI,
} from "@/scripts/ai/chat/types";

type CreateScheduleToolsParams = {
  userId?: string;
  timezone?: string;
  goalsView?: "list" | "text" | "todo";
  toolCallsExecuted: ToolCallUI[];
  onToolCall?: ToolCallHandler;
};

async function getCalendarEvents(
  userId: string,
  startDate: string,
  endDate: string,
  timezone?: string,
) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error("Invalid date format provided.");
      return { error: "Invalid date format. Please use ISO 8601 format." };
    }

    const userTimezone = timezone || "UTC";
    const startBounds = getUtcDayBoundsForTimezone(start, userTimezone);
    const endBounds = getUtcDayBoundsForTimezone(end, userTimezone);

    return await prisma.event.findMany({
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
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return { error: "Failed to fetch calendar events." };
  }
}

function pushToolCall(
  toolCallsExecuted: ToolCallUI[],
  onToolCall: ToolCallHandler | undefined,
  toolCall: ToolCallUI,
) {
  toolCallsExecuted.push(toolCall);
  onToolCall?.(toolCall);
}

export function createScheduleTools({
  userId,
  timezone,
  goalsView,
  toolCallsExecuted,
  onToolCall,
}: CreateScheduleToolsParams) {
  return {
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
          timezone,
        );

        const startDateFormatted = new Date(startDate + "T12:00:00").toLocaleDateString(
          "en-US",
          {
            month: "numeric",
            day: "numeric",
            timeZone: timezone,
          },
        );
        const endDateFormatted = new Date(endDate + "T12:00:00").toLocaleDateString(
          "en-US",
          {
            month: "numeric",
            day: "numeric",
            timeZone: timezone,
          },
        );

        const description =
          startDate !== endDate
            ? `Read events from ${startDateFormatted} - ${endDateFormatted}`
            : `Read events from ${startDateFormatted}`;

        pushToolCall(toolCallsExecuted, onToolCall, {
          name: "get_calendar_events",
          description,
        });

        return toolResult;
      },
    }),
    generate_calendar_events: tool({
      description:
        "Generate and save calendar events and reminders from natural language instructions.",
      inputSchema: generateCalendarEventsSchema,
      execute: async ({ text }) => {
        if (!userId || !timezone) {
          return { success: false, error: "User not authenticated" };
        }

        try {
          const userTimezone = timezone || "UTC";
          const goalsViewToUse = goalsView || "list";
          const rawResult = await generate_events(
            text,
            userTimezone,
            userId,
            goalsViewToUse,
          );

          const cleanedResult = rawResult.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleanedResult) as
            | Array<{ title: string; start: string; end: string }>
            | {
                events?: Array<{ title: string; start: string; end: string }>;
                reminders?: Array<{ title?: string; text?: string; time: string }>;
              };

          let events: Array<{ title: string; start: string; end: string }> = [];
          let reminders: Array<{ title?: string; text?: string; time: string }> = [];

          if (Array.isArray(parsed)) {
            events = parsed;
          } else {
            events = parsed.events || [];
            reminders = parsed.reminders || [];
          }

          let createdEvents: Array<{
            id: string;
            title: string;
            start: Date;
            end: Date;
          }> = [];

          if (events.length > 0) {
            createdEvents = await prisma.$transaction(
              events.map((event) =>
                prisma.event.create({
                  data: {
                    title: event.title,
                    start: new Date(event.start),
                    end: new Date(event.end),
                    userId,
                  },
                }),
              ),
            );

            recordEventActionsBatch(
              userId,
              createdEvents.map((event) => ({
                actionType: "created" as const,
                eventData: {
                  title: event.title,
                  start: event.start,
                  end: event.end,
                },
                eventId: event.id,
              })),
            ).catch((err) =>
              console.error(
                "Failed to record habit actions for generated events:",
                err,
              ),
            );

            invalidateAllUserCaches(userId).catch((err) =>
              console.error(
                "Failed to invalidate cache after generating events:",
                err,
              ),
            );

            await Promise.all(
              createdEvents.map((event) =>
                pushEventToGoogle(event.id, userId).catch((err) =>
                  console.error(
                    "Failed to sync generated event to Google Calendar:",
                    err,
                  ),
                ),
              ),
            );
          }

          const createdReminders: Array<{ id: string; text: string; time: Date }> = [];
          if (reminders.length > 0) {
            for (const reminder of reminders) {
              try {
                const createdReminder = await prisma.reminder.create({
                  data: {
                    text: reminder.text || reminder.title || "",
                    time: new Date(reminder.time),
                    isAISuggested: false,
                    userId,
                  },
                });
                createdReminders.push(createdReminder);
              } catch (error) {
                console.error("Error creating generated reminder:", error);
              }
            }
          }

          const descriptionParts: string[] = [];
          if (createdEvents.length > 0) {
            descriptionParts.push(
              `Created ${createdEvents.length} event${createdEvents.length === 1 ? "" : "s"}`,
            );
          }
          if (createdReminders.length > 0) {
            descriptionParts.push(
              `Created ${createdReminders.length} reminder${
                createdReminders.length === 1 ? "" : "s"
              }`,
            );
          }
          const description =
            descriptionParts.length > 0
              ? descriptionParts.join(" and ")
              : "Attempted to generate events, but nothing was created";

          pushToolCall(toolCallsExecuted, onToolCall, {
            name: "generate_calendar_events",
            description,
          });

          return {
            success: true,
            events: createdEvents.map((event) => ({
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end,
            })),
            reminders: createdReminders.map((reminder) => ({
              id: reminder.id,
              text: reminder.text,
              time: reminder.time,
            })),
          };
        } catch (error) {
          console.error("Error in generate_calendar_events tool:", error);
          return { success: false, error: "Failed to generate calendar events" };
        }
      },
    }),
    search_bulletin_notes: tool({
      description:
        "Search through the user's bulletin notes by title or content. Use this when you need to find specific information from the user's notes, ideas, or written content. The search will look through all their bulletin items and return relevant matches.",
      inputSchema: searchBulletinNotesSchema,
      execute: async ({ query, limit }) => {
        if (!userId) return { error: "User not authenticated" };

        const toolResult = await searchBulletinNotes(userId, query, limit || 5);
        const notes = Array.isArray(toolResult)
          ? toolResult.map((note) => ({
              id: note.id || note.title,
              title: note.title,
              type: note.type,
            }))
          : [];
        const description = `Searched notes for "${query}"`;

        pushToolCall(toolCallsExecuted, onToolCall, {
          name: "search_bulletin_notes",
          description,
          notes,
        });

        return toolResult;
      },
    }),
    save_to_memory: tool({
      description:
        "Save important information to the user's memory. Use this when the user shares something they want you to remember, or when they mention important facts, preferences, or events. Daily memories are for today's events; longterm memories persist indefinitely.",
      inputSchema: saveToMemorySchema,
      execute: async ({ content, memoryType }) => {
        if (!userId || !timezone) {
          return { success: false, error: "User not authenticated" };
        }

        try {
          await saveToMemory(userId, content, memoryType, timezone);
          const description = `Saved to ${memoryType} memory: "${content.substring(
            0,
            50,
          )}${content.length > 50 ? "..." : ""}"`;
          pushToolCall(toolCallsExecuted, onToolCall, {
            name: "save_to_memory",
            description,
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
          const processedValue =
            field === "wfhDays"
              ? value.split(",").map((d: string) => d.trim())
              : value;

          await updateUserProfileField(
            userId,
            category as keyof UserProfile,
            field,
            processedValue,
          );
          const description = `Updated profile: ${category}.${field} = "${value}"`;
          pushToolCall(toolCallsExecuted, onToolCall, {
            name: "update_user_profile",
            description,
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
          const searchResults = await searchMemoriesBySemantic(
            userId,
            query,
            Math.min(limit || 5, 10),
          );

          const formattedResults = searchResults.map((memory: MemorySearchResult) => ({
            type: memory.type,
            date: memory.date ? new Date(memory.date).toLocaleDateString() : "Long-term",
            content:
              memory.content.length > 300
                ? memory.content.substring(0, 300) + "..."
                : memory.content,
            relevanceScore: Math.round(memory.score * 100) / 100,
          }));

          const description = `Searched memories for "${query}" - found ${searchResults.length} results`;
          pushToolCall(toolCallsExecuted, onToolCall, {
            name: "search_memories",
            description,
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
}
