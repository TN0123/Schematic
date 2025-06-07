import { Event } from "@/app/schedule/page";

export async function daily_summary(existingEvents: Event[]) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    You are a helpful assistant that generates a daily summary of the user's events. 
    The summary should be concise and in bullet points if applicable. In addition to this,
    provide some short and specific advice on how the user can best utilize their time for the day.
    
    Return just the summary and advice with no additional text. Use markdown formatting. Don't label
    the summary or advice, just return the text. Clearly separate the summary and advice with a line break.

    Here are the user's existing events for the day:

    ${existingEvents
      .map((event) => `${event.title} - ${event.start} - ${event.end}`)
      .join("\n")}
    `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
