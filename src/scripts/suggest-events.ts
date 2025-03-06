import { PrismaClient } from '@prisma/client';
import { Event } from '@/app/schedule/page';

const prisma = new PrismaClient();

export async function suggest_events(userId: string, existingEvents: Event[], timezone: string) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require('dotenv').config();
    const geminiKey = process.env.GEMINI_API_KEY;
    const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());

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
        events. The current date is ${currentDate}.


        **Rules:**
        1. Suggest tasks that are not conflicting with existing events.
        2. STRICTLY ENFORCE: All suggested tasks MUST start at or after 6:00 AM and MUST end at or before 11:00 PM local time. NO EXCEPTIONS.
        3. Double-check all start and end times before returning them to ensure they are within this time window (6:00 AM - 11:00 PM).
        4. Suggest tasks that are relevant to the person's bulletin board.
        5. Suggest exactly three tasks for the day.
        
        
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
        - Earliest start time: ${currentDate.split('T')[0]}T06:00:00${currentDate.includes('Z') ? 'Z' : ''}
        - Latest end time: ${currentDate.split('T')[0]}T23:00:00${currentDate.includes('Z') ? 'Z' : ''}

        **Existing Events (Do NOT suggest conflicting times):**
            ${JSON.stringify(existingEvents, null, 2)}
        
        **Bulletin Items:**
        ${JSON.stringify(bulletinDict, null, 2)}

        **IMPORTANT FINAL CHECK:**
        Before returning your response, verify that ALL suggested tasks:
        - Start at or after 6:00 AM
        - End at or before 11:00 PM
        - Do not conflict with existing events
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