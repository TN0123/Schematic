export async function generate_events(text: string, timezone: string) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require('dotenv').config();
    const geminiKey = process.env.GEMINI_API_KEY;
  
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
    const currentDateTime = new Intl.DateTimeFormat('en-CA', { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
  }).format(new Date());
  
    const prompt = `
      You are an AI that extracts structured event details from text. Your goal is to generate a JSON array of event objects.
      
      **Rules:**
      1. Identify event names, dates, and times in the input.
      2. If no date is mentioned, assume today's date: **${currentDate}**.
      3. If am/pm is not specified, assume that the event's start time is past this datetime: **${currentDateTime}**.
      4. If am/pm is not specified, decide which one the user means based on the name of the event and with common sense (for example breakfast is more likely at 9am than 9pm).
      5. Convert times into **ISO 8601 format** (YYYY-MM-DDTHH:mm:ss).
      6. If the input specifies a time range (e.g., **3pm-4pm**), use it as **start and end times**.
      7. If an event has no end time, assume a default duration of **1 hour**.
      
      **Output Format (JSON array only, no extra text):**
      [
        {
          "id": "unique-string",
          "title": "Event Title",
          "start": "ISO8601 DateTime",
          "end": "ISO8601 DateTime"
        }
      ]
      
      **Example Input:**
      3pm-4pm Lunch  
      5pm-6pm Meeting  

      **Expected Output:**
      [
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
      ]

      **Here is the input text:**  
      ${text}

      **FINAL VERIFICATION BEFORE RETURNING RESPONSE:** 
        - IF AM/PM IS NOT SPECIFIED, ENSURE THE START TIME IS STRICTLY AFTER ${currentDateTime}. 
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
  