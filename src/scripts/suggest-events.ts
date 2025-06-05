import { PrismaClient } from "@prisma/client";
import { Event } from "@/app/schedule/page";

const prisma = new PrismaClient();

interface TimeSlot {
  start: string;
  end: string;
}

function getAvailableTimeSlots(events: Event[], day: Date): TimeSlot[] {
  const WORK_DAY_START = new Date(day);
  WORK_DAY_START.setHours(9, 0, 0, 0);

  const WORK_DAY_END = new Date(day);
  WORK_DAY_END.setHours(17, 0, 0, 0);

  const sortedEvents = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const availableSlots: TimeSlot[] = [];
  let currentPointer = new Date(WORK_DAY_START);

  for (const event of sortedEvents) {
    if (event.end <= currentPointer) continue;

    if (event.start > currentPointer) {
      availableSlots.push({
        start: currentPointer.toISOString(),
        end: event.start.toISOString(),
      });
    }

    if (event.end > currentPointer) {
      currentPointer = new Date(event.end);
    }
  }

  if (currentPointer < WORK_DAY_END) {
    availableSlots.push({
      start: currentPointer.toISOString(),
      end: WORK_DAY_END.toISOString(),
    });
  }

  return availableSlots;
}

export async function suggest_events(
  userId: string,
  existingEvents: Event[],
  timezone: string
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;
  const currentDateTime = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

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
    1. All tasks must start **strictly after the current time**: ${currentDateTime}
    2. Tasks must only use the provided **available time slots** (see below). Do not propose overlapping or conflicting tasks.
    3. All tasks must occur within the **available time slots**.
    4. You must return:
      - At **least 1** task
      - At **most 3** tasks
    5. Prefer tasks related to the person’s bulletin items or daily goals when possible.
    6. Output must be a **JSON array only** — no extra text.

    ---

    **AVAILABLE TIME SLOTS** (you may only schedule tasks within these ranges):
    ${JSON.stringify(availableTimeSlots, null, 2)}

    **CURRENT TIME** (you must not schedule anything before this):
    ${currentDateTime}

    **BULLETIN ITEMS (optional task ideas):**
    ${JSON.stringify(bulletinDict, null, 2)}

    **DAILY GOALS (priorities for today):**
    ${JSON.stringify(goals, null, 2)}

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
    - All tasks must start **after** ${currentDateTime}
    - All tasks must fall within the **availableTimeSlots**
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
