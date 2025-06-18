import { PrismaClient } from "@prisma/client";
import { Event } from "@/app/schedule/page";

const prisma = new PrismaClient();

interface TimeSlot {
  start: string;
  end: string;
}

function getAvailableTimeSlots(events: Event[], timezone: string): TimeSlot[] {
  const now = new Date();

  // Get today's date in the user's timezone using a more reliable method
  const nowInUserTz = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );
  const year = nowInUserTz.getFullYear();
  const month = nowInUserTz.getMonth();
  const day = nowInUserTz.getDate();
  const hour = nowInUserTz.getHours();
  const minute = nowInUserTz.getMinutes();
  const second = nowInUserTz.getSeconds();

  // Create start and end of day in user's timezone
  const startOfDayInUserTz = new Date(year, month, day, 0, 0, 0);
  const endOfDayInUserTz = new Date(year, month, day, 23, 59, 59);
  const currentTimeInUserTz = new Date(year, month, day, hour, minute, second);

  // Convert these to UTC for proper comparison with event times (which are in UTC)
  const localToUtcOffset = now.getTimezoneOffset() * 60 * 1000;
  const userToUtcOffset = getUserTimezoneOffsetMs(timezone, now);

  const startOfDayUTC = new Date(
    startOfDayInUserTz.getTime() + localToUtcOffset - userToUtcOffset
  );
  const endOfDayUTC = new Date(
    endOfDayInUserTz.getTime() + localToUtcOffset - userToUtcOffset
  );
  const currentTimeUTC = new Date(
    Math.max(now.getTime(), startOfDayUTC.getTime())
  );

  // Filter events that are today and in the future
  const todayEvents = events.filter((event) => {
    const eventStart = new Date(event.start);
    return (
      eventStart >= startOfDayUTC &&
      eventStart <= endOfDayUTC &&
      eventStart >= now
    );
  });

  const sortedEvents = [...todayEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const availableSlots: TimeSlot[] = [];
  let currentTime = currentTimeUTC;

  for (const event of sortedEvents) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // If there's a gap between current time and event start (minimum 15 minutes)
    if (eventStart.getTime() - currentTime.getTime() >= 15 * 60 * 1000) {
      availableSlots.push({
        start: currentTime.toISOString(),
        end: eventStart.toISOString(),
      });
    }

    // Move current time to end of event
    if (eventEnd > currentTime) {
      currentTime = eventEnd;
    }
  }

  // Add remaining time until end of work day (if at least 15 minutes available)
  if (endOfDayUTC.getTime() - currentTime.getTime() >= 15 * 60 * 1000) {
    availableSlots.push({
      start: currentTime.toISOString(),
      end: endOfDayUTC.toISOString(),
    });
  }

  return availableSlots;
}

// Helper function to get timezone offset in milliseconds from UTC
function getUserTimezoneOffsetMs(timezone: string, date: Date): number {
  // Create the same moment in UTC and in the target timezone
  const utcTime = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzTime = new Date(date.toLocaleString("en-US", { timeZone: timezone }));

  // The difference tells us the offset
  return tzTime.getTime() - utcTime.getTime();
}

export async function suggest_events(userId: string, timezone: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
    You are a helpful AI assistant that suggests a person up to three productive tasks for a 
    single day. Your goal is to return a JSON array of task objects that fit into the person's 
    **available time slots** today.

    ---

    **STRICTLY ENFORCED RULES (NO EXCEPTIONS):**
    1. All tasks must occur within the **available time slots**.
    2. You must return:
      - At **least 1** task
      - At **most 3** tasks
    3. Prefer tasks related to the person's bulletin items or daily goals when possible.
    4. Make sure to not suggest events that are already on the schedule. This means not 
    repeating the times or the titles of existing events. It is okay to suggest fewer 
    tasks than the maximum if you cannot find come up with tasks that are not already 
    on the schedule.
    5. Output must be a **JSON array only** — no extra text.

    ---

    **AVAILABLE TIME SLOTS** (you may only schedule tasks within these ranges):
    ${formattedTimeSlots}

    **BULLETIN ITEMS (optional task ideas):**
    ${JSON.stringify(bulletinDict, null, 2)}

    **DAILY GOALS (priorities for today):**
    ${JSON.stringify(goals, null, 2)}

    **EXISTING EVENTS FOR TODAY (don't repeat tasks that the user is already going to do today!):**
    ${eventSummary}

    **USER CONTEXT (if available):**
    ${user?.scheduleContext}

    ---

    **OUTPUT FORMAT (JSON only):**
    [
      {
        "id": "unique-string",
        "title": "Event Title",
        "start": "ISO8601 DateTime",
        "end": "ISO8601 DateTime"
      }
    ]

    ---

    **FINAL VERIFICATION BEFORE RETURNING:**
    - All tasks must fall within the **availableTimeSlots**
    - Make sure to not suggest events that are already on the schedule
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
        throw new Error("Failed to suggest events after multiple attempts.");
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
