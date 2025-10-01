import { PrismaClient } from "@prisma/client";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";

const prisma = new PrismaClient();

export async function daily_summary(
  date: Date,
  timezone: string,
  userId: string,
  goalsView?: "list" | "text" | "todo"
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Compute user-local day bounds as UTC instants
  const { startUtc, endUtc } = getUtcDayBoundsForTimezone(date, timezone);

  const eventsForDay = await prisma.event.findMany({
    where: {
      userId,
      // Include events overlapping the user's local day
      AND: [
        { start: { lt: endUtc } },
        { end: { gt: startUtc } },
      ],
    },
    select: {
      title: true,
      start: true,
      end: true,
    },
    orderBy: {
      start: "asc",
    },
  });

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

  // If no events for the day, return a simple message
  if (eventsForDay.length === 0) {
    return "No events scheduled for this day.";
  }

  // Create the event summary with times
  const eventSummary = eventsForDay
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

  let prompt = `
    You are a helpful assistant that provides some short and specific advice on how the user 
    can best utilize their time for the day based on their events and goals.
    
    Here is some context around the user's schedule (if available):
    BEGIN CONTEXT
    ${user?.scheduleContext}
    END CONTEXT

    Don't mention any specific times, instead use words like "morning", "afternoon", "evening", etc.
    
    Return just the advice with no additional text. Use markdown formatting. Don't label
    the advice, just return the text.

    Here are the user's existing events for the day:

    ${eventsForDay
      .map((event) => {
        const options: Intl.DateTimeFormatOptions = {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
          timeZone: timezone,
        };
        const start = new Date(event.start).toLocaleTimeString(
          "en-US",
          options
        );
        const end = new Date(event.end).toLocaleTimeString("en-US", options);
        return `- ${event.title}: ${start} - ${end}`;
      })
      .join("\n")}
    
    ${goalsContext || "User has not set any goals."}
      `;

  // console.log(prompt);

  const result = await model.generateContent(prompt);
  return `${eventSummary}ADVICE${result.response.text()}`;
}
