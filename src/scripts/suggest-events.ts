import { PrismaClient } from '@prisma/client';
import { Event } from '@/app/schedule/page';

const prisma = new PrismaClient();

export async function suggest_events(userId: string, existingEvents: Event[]){
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require('dotenv').config();
    const geminiKey = process.env.GEMINI_API_KEY;
    const currentDate = new Date().toISOString().split("T")[0];

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const bulletins = await prisma.bulletin.findMany({
        where: { userId },
        select: { title: true, content: true }
    });

    const bulletinDict: Record<string, string> = {};
    bulletins.forEach(b => {
        bulletinDict[b.title] = b.content;
    });

    const prompt = `
        You are a helpful AI that suggests a person tasks for the day to help
        them be more productive. Your goal is to generate a JSON array of task objects.

        The person you are helping has a calendar on which they might already have some
        events. Do not suggest tasks that conflict with existing events.

        The current date is ${currentDate}.

        The person you are helping also has a bulletin board of general things that are on their
        mind. Use this to help you figure out what to suggest.
        
        Suggest three tasks for the day.
        
        **Output Format (JSON array only, no extra text):**
      [
        {
          "id": "unique-string",
          "title": "Event Title",
          "start": "ISO8601 DateTime",
          "end": "ISO8601 DateTime"
        }
      ]

    **Existing Events (Do NOT suggest conflicting times):**
        ${JSON.stringify(existingEvents, null, 2)}
    
    **Bulletin Items:**
    ${JSON.stringify(bulletinDict, null, 2)}
    `;

    let retries = 3;
    let delay = 1000;

    for (let i = 0; i < retries; i++){
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
                throw new Error("Failed to suggest events after multiple attempts.");
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}