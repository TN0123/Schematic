import { Event } from "@/app/schedule/page";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function daily_summary(
  existingEvents: Event[],
  timezone: string,
  userId: string
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const goals = await prisma.goal.findMany({
    where: {
      userId,
    },
    select: { title: true, type: true },
  });

  let prompt = `
    You are a helpful assistant that provides some short and specific advice on how the user 
    can best utilize their time for the day based on their events and goals.
    If you mention any times, use 12 hour time.
    
    Return just the advice with no additional text. Use markdown formatting. Don't label
    the advice, just return the text.

    Here are the user's existing events for the day:

    ${existingEvents
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

  console.log(prompt);

  const result = await model.generateContent(prompt);
  return result.response.text();
}
