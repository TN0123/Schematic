import { PrismaClient } from "@prisma/client";
import { Event } from "@/app/schedule/types";
import { getHabitBasedSuggestions } from "@/lib/habit-profile";
import { aggregateAllTodos } from "@/lib/todo-aggregation";

const prisma = new PrismaClient();

interface TimeSlot {
  start: string;
  end: string;
}

function getAvailableTimeSlots(events: Event[], timezone: string): TimeSlot[] {
  const now = new Date();

  // Get today's date string in the user's timezone (YYYY-MM-DD format)
  const todayInUserTz = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  // Create start and end of day in the user's timezone
  // These will be interpreted as local time in the user's timezone
  const startOfDayInUserTz = new Date(`${todayInUserTz}T00:00:00`);
  const endOfDayInUserTz = new Date(`${todayInUserTz}T23:59:59`);

  // Get current time, but not earlier than start of day
  const currentTime = new Date(
    Math.max(now.getTime(), startOfDayInUserTz.getTime())
  );

  // Convert events to user timezone for easier comparison
  const todayEvents = events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Check if event overlaps with today and is in the future
    return (
      eventStart < endOfDayInUserTz &&
      eventEnd > startOfDayInUserTz &&
      eventEnd > currentTime
    );
  });

  // Sort events by start time
  const sortedEvents = [...todayEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const availableSlots: TimeSlot[] = [];
  let slotStart = currentTime;

  for (const event of sortedEvents) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // If event is in the past, skip it
    if (eventEnd <= currentTime) {
      continue;
    }

    // Adjust event start if it's in the past
    const adjustedEventStart = new Date(
      Math.max(eventStart.getTime(), currentTime.getTime())
    );

    // If there's a gap between current slot start and event start (minimum 15 minutes)
    if (adjustedEventStart.getTime() - slotStart.getTime() >= 15 * 60 * 1000) {
      availableSlots.push({
        start: slotStart.toISOString(),
        end: adjustedEventStart.toISOString(),
      });
    }

    // Move slot start to end of current event
    slotStart = new Date(Math.max(eventEnd.getTime(), slotStart.getTime()));
  }

  // Add remaining time until end of day (if at least 15 minutes available)
  if (endOfDayInUserTz.getTime() - slotStart.getTime() >= 15 * 60 * 1000) {
    availableSlots.push({
      start: slotStart.toISOString(),
      end: endOfDayInUserTz.toISOString(),
    });
  }

  return availableSlots;
}

export async function suggest_events(userId: string, timezone: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Get current date in user's timezone
  const today = new Date();
  const todayInUserTz = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);

  // Create start and end of day boundaries in user's timezone, then convert to Date objects
  const startOfDayString = `${todayInUserTz}T00:00:00`;
  const endOfDayString = `${todayInUserTz}T23:59:59`;

  const startOfDay = new Date(startOfDayString);
  const endOfDay = new Date(endOfDayString);

  const todaysEvents = await prisma.event.findMany({
    where: {
      userId,
      start: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      title: true,
      start: true,
      end: true,
    },
  });

  // Convert to the Event interface format
  const existingEvents: Event[] = todaysEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
  }));

  // Get existing reminders for today
  const todaysReminders = await prisma.reminder.findMany({
    where: {
      userId,
      time: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      text: true,
      time: true,
    },
  });

  // Generate event summary for the prompt
  const eventSummary = existingEvents
    .map((event) => {
      const options: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: timezone,
      };
      const start = new Date(event.start).toLocaleTimeString("en-US", options);
      const end = new Date(event.end).toLocaleTimeString("en-US", options);
      return `${event.title}: ${start} - ${end}`;
    })
    .join("\n");

  // Generate reminder summary for the prompt
  const reminderSummary = todaysReminders
    .map((reminder) => {
      const options: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: timezone,
      };
      const time = new Date(reminder.time).toLocaleTimeString("en-US", options);
      return `${reminder.text}: ${time}`;
    })
    .join("\n");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { scheduleContext: true, goalText: true },
  });

  const bulletins = await prisma.bulletin.findMany({
    where: { userId },
    orderBy: {
      updatedAt: "desc",
    },
    take: 10,
    select: { title: true, content: true, data: true },
  });

  const bulletinDict: Record<string, string> = {};
  bulletins.forEach((b) => {
    bulletinDict[b.title] = b.content;
  });

  const goals = await prisma.goal.findMany({
    where: { userId },
    select: { title: true, type: true },
  });

  // Fetch Goals Panel context for better reminder generation
  const aggregatedTodos = await aggregateAllTodos(userId, 50);

  // Extract and organize todo items with due dates for reminder generation
  interface TodoItemWithContext {
    bulletinTitle: string;
    text: string;
    dueDate?: string;
    checked: boolean;
  }

  const todoItems: TodoItemWithContext[] = aggregatedTodos.map(todo => ({
    bulletinTitle: todo.noteTitle,
    text: todo.text,
    dueDate: todo.dueDate,
    checked: todo.checked,
  }));

  // Filter todo items due today or overdue for high-priority reminders
  const todayDate = new Date(todayInUserTz);
  const urgentTodoItems = todoItems.filter((item) => {
    if (!item.dueDate) return false;
    const dueDate = new Date(item.dueDate);
    return dueDate <= todayDate;
  });

  // Format goals panel data for the prompt
  const goalsContext = {
    goalText: user?.goalText || "",
    goalsList: goals,
    todoItems: todoItems.slice(0, 15), // Limit to most recent 15 items
    urgentTodoItems: urgentTodoItems.slice(0, 10), // Limit to 10 most urgent
  };

  const availableTimeSlots = getAvailableTimeSlots(existingEvents, timezone);

  // Get habit-based suggestions
  const habitSuggestions = await getHabitBasedSuggestions(
    userId,
    timezone,
    availableTimeSlots.map(slot => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    }))
  );

  // Format habit suggestions for the prompt
  const formattedHabitSuggestions = habitSuggestions.length > 0
    ? habitSuggestions
        .map((suggestion, index) => {
          const timeOptions: Intl.DateTimeFormatOptions = {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
            timeZone: timezone,
          };
          const startTime = suggestion.start.toLocaleTimeString("en-US", timeOptions);
          const endTime = suggestion.end.toLocaleTimeString("en-US", timeOptions);
          const confidencePercent = Math.round(suggestion.confidence * 100);
          
          return `${index + 1}. ${suggestion.title}: ${startTime} - ${endTime} (${confidencePercent}% confidence based on your habits)`;
        })
        .join("\n")
    : "No habit-based suggestions available yet.";

  // Format available time slots in a readable way for the LLM
  const formattedTimeSlots = availableTimeSlots
    .map((slot, index) => {
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: timezone,
      };

      const startTime = new Date(slot.start).toLocaleTimeString(
        "en-US",
        timeOptions
      );
      const endTime = new Date(slot.end).toLocaleTimeString(
        "en-US",
        timeOptions
      );
      const duration = Math.round(
        (new Date(slot.end).getTime() - new Date(slot.start).getTime()) /
          (1000 * 60)
      );

      return `Slot ${index + 1}: ${startTime} - ${endTime} (${duration} minutes)
    Start: ${slot.start}
    End: ${slot.end}`;
    })
    .join("\n\n");

  const prompt = `
    You are a helpful AI assistant that suggests productive tasks and helpful reminders for a 
    single day. Your goal is to return a JSON object with both events and reminders.

    ---

    **STRICTLY ENFORCED RULES (NO EXCEPTIONS):**
    1. **EVENTS:** All events must occur within the **available time slots**.
    2. **EVENTS:** You must suggest 0-3 events (at least 1 if time slots are available).
    3. **REMINDERS:** You must suggest 0-3 helpful reminders for today.
    4. **REMINDERS:** Reminders should be short notifications/alerts, not full events.
    5. **REMINDERS:** Reminder times can be any time today (not restricted to available slots).
    6. **PRIORITIZE habit-based suggestions** - they have high confidence scores based on user's past behavior.
    7. **PRIORITIZE reminders for urgent/overdue todo items** - these are critical tasks the user has marked as important.
    8. Prefer suggestions related to the person's bulletin items, daily goals, or Goals Panel tasks when possible.
    9. Make sure to not suggest events/reminders that are already scheduled.
    10. Output must be a **JSON object only** — no extra text.

    ---

    **HABIT-BASED SUGGESTIONS (prioritize these - based on user's patterns):**
    ${formattedHabitSuggestions}

    **AVAILABLE TIME SLOTS** (events may only be scheduled within these ranges):
    ${formattedTimeSlots}

    **BULLETIN ITEMS (optional task ideas):**
    ${JSON.stringify(bulletinDict, null, 2)}

    **DAILY GOALS (priorities for today):**
    ${JSON.stringify(goals, null, 2)}

    **GOALS PANEL CONTEXT (IMPORTANT for reminder generation):**
    
    User's Goal Text:
    ${goalsContext.goalText || "None"}

    User's Goals List:
    ${goalsContext.goalsList.length > 0 ? goalsContext.goalsList.map((g: any) => `- ${g.title} (${g.type})`).join('\n') : "None"}

    **URGENT TODO ITEMS (DUE TODAY OR OVERDUE - HIGHEST PRIORITY FOR REMINDERS):**
    ${goalsContext.urgentTodoItems.length > 0 
      ? goalsContext.urgentTodoItems.map((item: TodoItemWithContext) => 
          `- "${item.text}" from list "${item.bulletinTitle}" (Due: ${item.dueDate})`
        ).join('\n')
      : "No urgent todo items"}

    **ALL ACTIVE TODO ITEMS (for context):**
    ${goalsContext.todoItems.length > 0 
      ? goalsContext.todoItems.map((item: TodoItemWithContext) => 
          `- "${item.text}" from list "${item.bulletinTitle}"${item.dueDate ? ` (Due: ${item.dueDate})` : ''}`
        ).join('\n')
      : "No active todo items"}

    ---

    **EXISTING EVENTS FOR TODAY (don't repeat!):**
    ${eventSummary}

    **EXISTING REMINDERS FOR TODAY (don't repeat!):**
    ${reminderSummary}

    **USER CONTEXT (if available):**
    ${user?.scheduleContext}

    ---

    **OUTPUT FORMAT (JSON only):**
    {
      "events": [
        {
          "id": "unique-string",
          "title": "Event Title",
          "start": "ISO8601 DateTime",
          "end": "ISO8601 DateTime"
        }
      ],
      "reminders": [
        {
          "text": "Reminder text",
          "time": "ISO8601 DateTime",
          "isAISuggested": true
        }
      ]
    }

    **REMINDER GENERATION GUIDELINES:**
    1. **PRIORITIZE urgent/overdue todo items** - these are the user's most important tasks!
    2. Generate reminders that help the user complete their todo items (e.g., "Start working on [task]", "Don't forget: [task]")
    3. For todo items with due dates, suggest reminders at strategic times during the day
    4. Consider the user's goal text and goals list when generating reminders
    5. Include general productivity reminders (breaks, hydration, reviews) if appropriate
    
    **REMINDER EXAMPLES:**
    - "Don't forget: [urgent todo item text]" at appropriate time
    - "Start working on [todo item]" at mid-morning
    - "Check progress on [goal from goal text]" at afternoon
    - "Take a 5-minute break" at 2:30 PM
    - "Review your daily goals" at 9:00 AM

    ---

    **FINAL VERIFICATION BEFORE RETURNING:**
    - All events must fall within the **availableTimeSlots**
    - Don't suggest events/reminders that already exist
    - Reminders are brief and actionable
    - Prioritized reminders for urgent todo items
  `;

  // console.log(prompt);

  let retries = 3;
  let delay = 1000;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      //console.log(result.response.text());
      return result.response.text();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Attempt ${i + 1} failed: ${error.message}`);
      } else {
        console.error(`Attempt ${i + 1} failed with unknown error:`, error);
      }

      if (i === retries - 1) {
        throw new Error(
          "Failed to suggest events and reminders after multiple attempts."
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
