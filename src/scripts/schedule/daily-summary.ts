import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function daily_summary(
  date: Date,
  timezone: string,
  userId: string
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Create start and end of day boundaries in the user's timezone
  // Get the date string in the user's timezone (YYYY-MM-DD format)
  const userDateStr = date.toLocaleDateString("en-CA", {
    timeZone: timezone,
  });

  // Very simple approach: Use Intl.DateTimeFormat to get the right times
  // We'll create the dates in the user's timezone and convert to UTC

  // Create start of day (00:00:00.000) in user's timezone
  const startOfDay = new Date(`${userDateStr}T00:00:00.000`);

  // Create end of day (23:59:59.999) in user's timezone
  const endOfDay = new Date(`${userDateStr}T23:59:59.999`);

  // Now we need to adjust these to be in the user's timezone
  // Get the timezone offset in minutes for this date
  const testDate = new Date(userDateStr + "T12:00:00");
  const utcTime = testDate.getTime();
  const userTzTime = new Date(
    testDate.toLocaleString("en-US", { timeZone: timezone })
  ).getTime();
  const offsetMs = utcTime - userTzTime;

  // Apply the offset to our boundaries
  const startOfDayAdjusted = new Date(startOfDay.getTime() + offsetMs);
  const endOfDayAdjusted = new Date(endOfDay.getTime() + offsetMs);

  const eventsForDay = await prisma.event.findMany({
    where: {
      userId,
      start: {
        gte: startOfDayAdjusted,
        lte: endOfDayAdjusted,
      },
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

  const goals = await prisma.goal.findMany({
    where: {
      userId,
    },
    select: { title: true, type: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { scheduleContext: true },
  });

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
    
      Here are the user's goals:

      ${goals.map((goal) => `*   ${goal.title} (${goal.type} GOAL)`).join("\n")}
      `;

  // console.log(prompt);

  const result = await model.generateContent(prompt);
  return `${eventSummary}ADVICE${result.response.text()}`;
}
