import { z } from "zod";

export const getCalendarEventsSchema = z.object({
  startDate: z.string().describe("Start date in ISO 8601 format (YYYY-MM-DD)"),
  endDate: z.string().describe("End date in ISO 8601 format (YYYY-MM-DD)"),
});

export const searchBulletinNotesSchema = z.object({
  query: z
    .string()
    .describe(
      "The search query to find relevant notes. Can be keywords, phrases, or topics to search for in note titles and content.",
    ),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return (default: 5, max: 10)"),
});

export const saveToMemorySchema = z.object({
  content: z
    .string()
    .describe(
      "The information to save. Be concise but include relevant context.",
    ),
  memoryType: z
    .enum(["daily", "longterm"])
    .describe(
      "daily = today's events/notes (date-specific), longterm = durable facts that should persist (preferences, relationships, important info)",
    ),
});

export const updateUserProfileSchema = z.object({
  category: z
    .enum(["preferences", "routines", "constraints", "workPatterns"])
    .describe(
      "The category of profile to update: preferences (wakeTime, workHours, focusTimePreference, meetingPreference), routines (morningRoutine, eveningRoutine), constraints (commute, familyObligations), workPatterns (wfhDays, officeLocation)",
    ),
  field: z
    .string()
    .describe(
      "The specific field within the category to update (e.g., 'wakeTime', 'morningRoutine', 'commute', 'wfhDays')",
    ),
  value: z
    .string()
    .describe(
      "The value to set for this field. For wfhDays, use comma-separated days like 'Monday, Friday'",
    ),
});

export const searchMemoriesSchema = z.object({
  query: z
    .string()
    .describe(
      "What to search for in memories. Can be a question, topic, or keywords related to what you want to find.",
    ),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of results to return (default: 5, max: 10)"),
});

export const generateCalendarEventsSchema = z.object({
  text: z
    .string()
    .describe(
      "The user's natural language instructions describing events and reminders to add to their calendar.",
    ),
});
