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
  userId?: string
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  let context = "";
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { scheduleContext: true },
      });
      if (user && user.scheduleContext) {
        context = user.scheduleContext;
      }
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
