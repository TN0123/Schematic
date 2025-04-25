import { PrismaClient } from "@prisma/client";
import { Event } from "@/app/schedule/page";

const prisma = new PrismaClient();

export async function suggest_events(
  userId: string,
  existingEvents: Event[],
  timezone: string
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;
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

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const bulletins = await prisma.bulletin.findMany({
    where: { userId },
    select: { title: true, content: true },
  });

  const bulletinDict: Record<string, string> = {};
  bulletins.forEach((b) => {
    bulletinDict[b.title] = b.content;
  });

  const goals = await prisma.goal.findMany({
    where: { userId },
    select: { title: true, type: true },
  });

  // console.log(goals);

  const prompt = `
        You are a helpful AI that suggests a person tasks for a single day to help
        them be more productive. Your goal is to generate a JSON array of task objects.
        The person you are helping has a calendar on which they might already have some
        events. The person you are helping also may also have some notes and a list of daily goals.
        
        The current date and time is ${currentDateTime}. 
        

        **STRICTLY ENFORCED RULES (NO EXCEPTIONS):**
        1. **ONLY SUGGEST TASKS WITH START TIMES STRICTLY AFTER THE CURRENT TIME (${currentDateTime}).**  
           - If a task would start before this time, **DO NOT SUGGEST IT**.  
           - If no valid time slots exist, return an empty array.
        2. **DO NOT SUGGEST TASKS THAT CONFLICT WITH EXISTING EVENTS.**  
        3. **ALL TASKS MUST START AT OR AFTER 6:00 AM AND END AT OR BEFORE 11:00 PM LOCAL TIME.**  
        4. **DOUBLE-CHECK ALL TIMES BEFORE RETURNING THEM** to ensure they are:  
           - After the current time.  
           - Within the allowed time range (6:00 AM - 11:00 PM).  
           - Not conflicting with any existing events.  
        5. When possible, only suggest tasks that are relevant to the person's bulletin board or daily goals.  
        6. Suggest **AT MOST three tasks**
        7. Suggest **AT LEAST one task**
        
        
        **Output Format (JSON array only, no extra text):**
        [
            {
            "id": "unique-string",
            "title": "Event Title",
            "start": "ISO8601 DateTime",
            "end": "ISO8601 DateTime"
            }
        ]

        **Valid time range for today:**
        - **Earliest possible start time:** The **later** of 6:00 AM or the current time (${currentDateTime})
        - **Latest end time:** ${currentDateTime.split("T")[0]}T23:00:00${
    currentDateTime.includes("Z") ? "Z" : ""
  }

        **Existing Events (DO NOT suggest conflicting times):**
            ${JSON.stringify(existingEvents, null, 2)}
        
        **Bulletin Items(Might be empty):**
        ${JSON.stringify(bulletinDict, null, 2)}

        **Daily Goals (Might be empty):**
        ${JSON.stringify(goals, null, 2)}

        **FINAL VERIFICATION BEFORE RETURNING RESPONSE:**  
        - Ensure ALL suggested tasks start **strictly after the current time** (${currentDateTime}).  
        - Ensure ALL tasks fall within 6:00 AM - 11:00 PM.  
        - Ensure NO tasks conflict with existing events.  
        - If no valid time slots exist, return an empty array.
    `;

  // console.log(prompt);

  let retries = 3;
  let delay = 1000;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      //console.log(result.response.text());
      return result.response.text();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Attempt ${i + 1} failed: ${error.message}`);
      } else {
        console.error(`Attempt ${i + 1} failed with unknown error:`, error);
      }

      if (i === retries - 1) {
        throw new Error("Failed to suggest events after multiple attempts.");
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
