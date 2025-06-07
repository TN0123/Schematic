import { PrismaClient } from "@prisma/client";
import { Event } from "@/app/schedule/page";

const prisma = new PrismaClient();

interface TimeSlot {
  start: string;
  end: string;
}

function getAvailableTimeSlots(events: Event[], day: Date): TimeSlot[] {
  const now = new Date();
  const workDayEnd = new Date(day);
  workDayEnd.setHours(23, 59, 59, 999);

  const todayEvents = events.filter((event) => {
    const eventStart = new Date(event.start);
    return eventStart >= now && eventStart <= workDayEnd;
  });

  const sortedEvents = [...todayEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const availableSlots: TimeSlot[] = [];
  let currentTime = new Date(now);

  for (const event of sortedEvents) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    if (eventStart > currentTime) {
      availableSlots.push({
        start: currentTime.toISOString(),
        end: eventStart.toISOString(),
      });
    }

    if (eventEnd > currentTime) {
      currentTime = eventEnd;
    }
  }

  if (currentTime < workDayEnd) {
    availableSlots.push({
      start: currentTime.toISOString(),
      end: workDayEnd.toISOString(),
    });
  }

  return availableSlots;
}

export async function suggest_events(userId: string, existingEvents: Event[]) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const bulletins = await prisma.bulletin.findMany({
    where: { userId },
    select: { title: true, content: true },
  });

  const bulletinDict: Record<string, string> = {};
  bulletins.forEach((b) => {
    bulletinDict[b.title] = b.content;
  });

  const goals = await prisma.goal.findMany({
    where: { userId },
    select: { title: true, type: true },
  });

  const availableTimeSlots = getAvailableTimeSlots(existingEvents, new Date());

  const prompt = `
    You are a helpful AI assistant that suggests a person up to three productive tasks for a single day. Your goal is to return a JSON array of task objects that fit into the person’s **available time slots** today.

    ---

    **STRICTLY ENFORCED RULES (NO EXCEPTIONS):**
    1. All tasks must occur within the **available time slots**.
    2. You must return:
      - At **least 1** task
      - At **most 3** tasks
    3. Prefer tasks related to the person’s bulletin items or daily goals when possible.
    4. Make sure to not suggest events that are already on the schedule (this means not repeating the times or the titles of existing events)
    5. Output must be a **JSON array only** — no extra text.

    ---

    **AVAILABLE TIME SLOTS** (you may only schedule tasks within these ranges):
    ${JSON.stringify(availableTimeSlots, null, 2)}

    **BULLETIN ITEMS (optional task ideas):**
    ${JSON.stringify(bulletinDict, null, 2)}

    **DAILY GOALS (priorities for today):**
    ${JSON.stringify(goals, null, 2)}

    **EXISTING EVENTS (don't repeat things already on the schedule):**
    ${JSON.stringify(existingEvents, null, 2)}

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

  console.log(prompt);

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
