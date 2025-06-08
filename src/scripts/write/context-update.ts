import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function contextUpdate(history: any[], documentId: any) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { context: true },
  });

  const context = document?.context;

  const prompt = `
    You are an AI writing assistant embedded in a text editor and have just helped a user with their writing.
    The editor contains a context for you to use to help the user with their writing. Now that you have helped 
    the user, your task is to update the context to reflect your understanding of the user's writing and goals.
    This context will later be given to you to help you produce outputs that are more aligned with the user's goals.

    Here is the history of your conversation with the user:

    BEGINNING OF HISTORY
    ${JSON.stringify(history)}
    END OF HISTORY

    Here is the current context:
    BEGINNING OF CONTEXT
    ${context}
    END OF CONTEXT

    If the current context is empty create a new context that reflects what the user's goal is for the document
    they are writing. Otherwise, only make minor changes to the context that reflects the most recent message that 
    you have received from the user.

    Return only the full updated context with no additional text.
  `;

  const response = await model.generateContent(prompt);
  const updatedContext = response.response.text();

  await prisma.document.update({
    where: { id: documentId },
    data: { context: updatedContext },
  });

  // console.log("Prompt: ", prompt);
  // console.log("Updated Context: ", updatedContext);
}
