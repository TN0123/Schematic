import { Event } from "@/app/schedule/page";

export async function daily_summary(existingEvents: Event[], timezone: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    You are a helpful assistant that generates a daily summary of the user's events. 
    The summary should be concise and in bullet points if applicable. In addition to this,
    provide some short and specific advice on how the user can best utilize their time for the day.
    If you mention any times, use 12 hour time.
    
    Return just the summary and advice with no additional text. Use markdown formatting. Don't label
    the summary or advice, just return the text. Clearly separate the summary and advice with a line break.

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
        return `*   ${event.title}: ${start} - ${end}`;
      })
      .join("\n")}
    `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
