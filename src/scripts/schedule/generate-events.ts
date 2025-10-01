import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function generate_events(
  text: string,
  timezone: string,
  userId: string,
  goalsView?: "list" | "text" | "todo"
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const currentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
  }).format(new Date());
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { scheduleContext: true, goalText: true },
  });

  let goalsContext = "";
  
  // Fetch goals context based on the selected view
  if (goalsView === "text" && user?.goalText) {
    goalsContext = `User's Goals (Free-form Text):\n${user.goalText}`;
  } else if (goalsView === "todo") {
    // Fetch the most recent todo bulletin
    const todoBulletins = await prisma.bulletin.findMany({
      where: {
        userId,
        type: "todo",
      },
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: { title: true, data: true },
    });
    
    if (todoBulletins.length > 0) {
      const todo = todoBulletins[0];
      const items = (todo.data as any)?.items || [];
      const uncheckedItems = items.filter((item: any) => !item.checked);
      const checkedItems = items.filter((item: any) => item.checked);
      
      goalsContext = `User's To-Do List (${todo.title}):\n`;
      if (uncheckedItems.length > 0) {
        goalsContext += `Pending Tasks:\n${uncheckedItems.map((item: any) => `- [ ] ${item.text}`).join("\n")}\n`;
      }
      if (checkedItems.length > 0) {
        goalsContext += `Completed Tasks:\n${checkedItems.map((item: any) => `- [x] ${item.text}`).join("\n")}`;
      }
    } else {
      goalsContext = "User has no to-do lists created yet.";
    }
  } else {
    // Default to list view (structured goals)
    const goals = await prisma.goal.findMany({
      where: { 
        userId,
      },
      select: { title: true, type: true },
    });
    goalsContext = `User's Goals:\n${goals.map((goal) => `- ${goal.title} (${goal.type} goal)`).join("\n")}`;
  }

  const prompt = `
      You are an AI that extracts structured event and reminder details from text. Your goal is to generate a JSON object containing both events and reminders.
      You may also be asked to come up with a schedule for the user, only do this if explicitly requested.
      
      **Rules:**
      1. Identify event names, dates, and times in the input for EVENTS.
      2. Identify reminders, alerts, or notifications with their times for REMINDERS.
      3. If no date is mentioned, assume today's date: **${currentDate}**.
      4. If am/pm is not specified, decide which one the user means based on the name of the event/reminder and with common 
      sense (for example breakfast is more likely 9am-10am than 9pm-10pm). Always assume the user is using 12hr format 
      by default. Another thing you can use to determine which time the user means is the current time: ${currentDateTime}.
      They may be more likely to mean the time that is after the current time.
      5. Convert times into **ISO 8601 format** (YYYY-MM-DDTHH:mm:ss).
      6. If an event specifies a time range (e.g., **3pm-4pm**), use it as **start and end times**.
      7. If an event has no end time, assume a default duration of **1 hour**.
      8. For reminders, use the exact time specified - reminders are notifications, not events with durations.
      
      **What counts as an EVENT vs REMINDER:**
      - EVENTS: Things that happen at a specific time and have a duration (meetings, appointments, activities, work sessions, etc.)
      - REMINDERS: Notifications, alerts, or things to remember at a specific time (take medication, call someone, check something, etc.)
      
      **Output Format (JSON object only, no extra text):**
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
            "time": "ISO8601 DateTime"
          }
        ]
      }
      
      **Example Input:**
      3pm-4pm Lunch
      5pm-6pm Meeting
      Remind me to take medicine at 9am
      Call mom at 2pm reminder

      **Expected Output:**
      {
        "events": [
          {
            "id": "lunch",
            "title": "Lunch",
            "start": "${currentDate}T15:00:00",
            "end": "${currentDate}T16:00:00"
          },
          {
            "id": "meeting",
            "title": "Meeting",
            "start": "${currentDate}T17:00:00",
            "end": "${currentDate}T18:00:00"
          }
        ],
        "reminders": [
          {
            "text": "Take medicine",
            "time": "${currentDate}T09:00:00"
          },
          {
            "text": "Call mom",
            "time": "${currentDate}T14:00:00"
          }
        ]
      }

      **Here is the input text:**  
      ${text}

      Here is some context about the user's schedule that may or may not be relevant to the input text, 
      use it if applicable, otherwise ignore it.
      
      BEGIN CONTEXT
      GENERAL CONTEXT:
      ${user?.scheduleContext}

      ${goalsContext || "User has not set any goals."}
      END CONTEXT

      Generate the events and reminders in the output format.
    `;

  // console.log("PROMPT: ", prompt);

  //Multiple calls retry mechanism with exponential backoff
  let retries = 3;
  let delay = 1000;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Attempt ${i + 1} failed: ${error.message}`);
      } else {
        console.error(`Attempt ${i + 1} failed with unknown error:`, error);
      }

      if (i === retries - 1) {
        throw new Error("Failed to generate content after multiple attempts.");
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
