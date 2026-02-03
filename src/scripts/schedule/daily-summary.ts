import { PrismaClient } from "@prisma/client";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";
import { aggregateAllTodos, formatTodosForPrompt } from "@/lib/todo-aggregation";
import { getMemoryContext, formatMemoryForPrompt } from "@/lib/memory";

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
    select: { goalText: true },
  });

  // Get memory context from the new multi-layer memory system
  const memoryData = await getMemoryContext(userId, timezone);
  const memoryContext = formatMemoryForPrompt(memoryData);

  let goalsContext = "";
  
  // Fetch goals context based on the selected view
  if (goalsView === "text" && user?.goalText) {
    goalsContext = `User's Goals (Free-form Text):\n${user.goalText}`;
  } else if (goalsView === "todo") {
    // Fetch and aggregate all todos from all todo bulletins
    const allTodos = await aggregateAllTodos(userId, 50); // Limit to 50 todos
    goalsContext = formatTodosForPrompt(allTodos);
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
    ${memoryContext}
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
