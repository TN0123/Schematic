import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateScheduleContext(userId: string, newContext: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { scheduleContext: newContext },
    });
  } catch (error) {
    console.error("Error updating schedule context:", error);
  }
}

export async function scheduleChat(
  instructions: string,
  history: any[],
  userId?: string,
  timezone?: string
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  let context = "";
  let goals: { title: string; type: string }[] = [];
  let events: { title: string; start: Date; end: Date }[] = [];
  if (userId && timezone) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { scheduleContext: true },
      });
      if (user && user.scheduleContext) {
        context = user.scheduleContext;
      }
      goals = await prisma.goal.findMany({
        where: {
          userId,
        },
        select: { title: true, type: true },
      });

      const now = new Date();
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: timezone })
      );
      const startOfDay = new Date(userTime);
      startOfDay.setHours(0, 0, 0, 0);

      events = await prisma.event.findMany({
        where: {
          userId,
          start: {
            gte: startOfDay,
          },
        },
        select: { title: true, start: true, end: true },
      });
    } catch (e) {
      console.error("Could not find user to get schedule context");
    }
  }

  const systemPrompt = `
You are an AI life assistant. A user is chatting with you to manage their schedule.

Here is the context about the user's schedule, preferences, and other relevant information. Use this to inform your responses and be a helpful assistant.
BEGINNING OF CONTEXT
${context}
END OF CONTEXT

Here are the user's goals:
${goals.map((goal) => `*   ${goal.title} (${goal.type} GOAL)`).join("\n")}

Here are the user's events for the rest of the day:
${events
  .map((event) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: timezone,
    };
    const start = new Date(event.start).toLocaleTimeString("en-US", options);
    const end = new Date(event.end).toLocaleTimeString("en-US", options);
    return `- ${event.title}: ${start} - ${end}`;
  })
  .join("\n")}

The user is chatting with you. Your job is to be a helpful and friendly assistant.
Based on the conversation, you must decide if the schedule context needs to be updated. For example, if the user tells you "I like to go for a run every morning" or "My work hours are 9am to 5pm", you should update the context.

You must return a JSON object with two properties:
- "response": (string) Your chat response to the user. This will be displayed in the chat.
- "contextUpdate": (string | null) If you think the context needs to be updated based on the conversation, provide the new, updated context here. If not, this should be null. The new context should be a complete replacement for the old one, so make sure to include all relevant information, both old and new.

Your response to the user should be natural and conversational. Do not mention the context update in your response to the user.
Do not use Markdown in your "response" to the user.
Your output MUST be a valid JSON object.
`;

  const userPrompt = instructions;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const formattedHistory = history.map(
    (entry: { role: string; content: string }) => ({
      role: entry.role,
      parts: [{ text: entry.content }],
    })
  );

  const chatSession = geminiModel.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...formattedHistory,
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await chatSession.sendMessage(userPrompt);
  const responseText = await result.response.text();
  const response = JSON.parse(responseText);

  //   console.log(response);

  const shouldUpdateContext = response.contextUpdate && userId;

  if (shouldUpdateContext) {
    await updateScheduleContext(userId, response.contextUpdate);
  }

  return { response: response.response, contextUpdated: !!shouldUpdateContext };
}
