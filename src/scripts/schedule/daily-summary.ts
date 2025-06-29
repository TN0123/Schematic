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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Fetch events for the specific day from the database
  // Create start and end of day boundaries in the user's timezone
  const getDateBoundaryInTimezone = (
    date: Date,
    timezone: string,
    isEndOfDay: boolean = false
  ): Date => {
    // Get the date string in the user's timezone (YYYY-MM-DD format)
    const userDateStr = date.toLocaleDateString("en-CA", {
      timeZone: timezone,
    });

    // Create the datetime string for start or end of day
    const timeStr = isEndOfDay ? "23:59:59.999" : "00:00:00.000";
    const dateTimeStr = `${userDateStr}T${timeStr}`;

    // Create a date object and adjust for timezone
    const localDate = new Date(dateTimeStr);

    // Calculate timezone offset difference to convert to proper UTC time
    const testDate = new Date();
    const localOffset = testDate.getTimezoneOffset() * 60000; // Convert to milliseconds
    const userOffset = getTimezoneOffsetMs(testDate, timezone);
    const offsetDifference = userOffset - localOffset;

    return new Date(localDate.getTime() - offsetDifference);
  };

  const getTimezoneOffsetMs = (date: Date, timezone: string): number => {
    const utcTime = new Date(
      date.toLocaleString("en-US", { timeZone: "UTC" })
    ).getTime();
    const userTime = new Date(
      date.toLocaleString("en-US", { timeZone: timezone })
    ).getTime();
    return utcTime - userTime;
  };

  const startOfDay = getDateBoundaryInTimezone(date, timezone, false);
  const endOfDay = getDateBoundaryInTimezone(date, timezone, true);

  const eventsForDay = await prisma.event.findMany({
    where: {
      userId,
      start: {
        gte: startOfDay,
        lte: endOfDay,
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
