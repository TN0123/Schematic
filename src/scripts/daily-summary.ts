import { Event } from "@/app/schedule/page";

export async function daily_summary(existingEvents: Event[]) {
  if (existingEvents.length === 0) {
    return "";
  }

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    You are a helpful assistant that generates a daily summary of the user's events. 
    The summary should be concise and in bullet points if applicable.

    Here are the user's existing events for the day:

    ${existingEvents
      .map((event) => `${event.title} - ${event.start} - ${event.end}`)
      .join("\n")}
    `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
