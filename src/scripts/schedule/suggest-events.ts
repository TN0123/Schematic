import { PrismaClient } from "@prisma/client";
import { Event } from "@/app/schedule/types";
import { getHabitBasedSuggestions } from "@/lib/habit-profile";

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
    select: { scheduleContext: true },
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
    7. Prefer suggestions related to the person's bulletin items or daily goals when possible.
    8. Make sure to not suggest events/reminders that are already scheduled.
    9. Output must be a **JSON object only** — no extra text.

    ---

    **HABIT-BASED SUGGESTIONS (prioritize these - based on user's patterns):**
    ${formattedHabitSuggestions}

    **AVAILABLE TIME SLOTS** (events may only be scheduled within these ranges):
    ${formattedTimeSlots}

    **BULLETIN ITEMS (optional task ideas):**
    ${JSON.stringify(bulletinDict, null, 2)}

    **DAILY GOALS (priorities for today):**
    ${JSON.stringify(goals, null, 2)}

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

    **REMINDER EXAMPLES:**
    - "Take a 5-minute break" at 2:30 PM
    - "Drink water" at 10:00 AM
    - "Prepare for tomorrow's meeting" at 4:00 PM
    - "Review daily goals" at 9:00 AM
    - "Check on project X progress" at 3:00 PM

    ---

    **FINAL VERIFICATION BEFORE RETURNING:**
    - All events must fall within the **availableTimeSlots**
    - Don't suggest events/reminders that already exist
    - Reminders are brief and actionable
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
