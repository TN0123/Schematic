import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function chat(
  currentText: string,
  instructions: string,
  history: any[],
  documentId: any,
  userId?: string,
  selectedModel: "basic" | "premium" = "premium",
  actionMode: "ask" | "edit" = "edit"
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { context: true },
  });

  const context = document?.context;

  const systemPrompt =
    actionMode === "edit"
      ? `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested something of you.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand what the user has written so far and help the user improve, edit, expand, condense, rewrite, or otherwise 
        modify the content accordingly. 
        
        Your job is to return an array of EXACTLY two items in strict JSON format:
            1. A string of text responding to what the user said to you.
            2. a JSON object that contains the changes that should be made to the original text.

        CRITICAL: Your entire response must be a valid JSON array with exactly two elements.

        The JSON object must have the following properties:
        - each key is a snippet or section from the original text that you think should be replaced with new text
        - each value is the new text that should replace the original text
        - only include parts of the text that need to be changed, do not include any text that does not need to be changed
        - if you want to add text to the end of the original text, use the key "!ADD_TO_END!" and have the value as the text to add

        FORMATTING RULES:
        - Do NOT wrap your response in json blocks or any other formatting
        - Do NOT include any text before or after the JSON array
        - Ensure all strings in the JSON are properly escaped (use \\\\n for newlines, \\\\" for quotes)
        - Never use more than one key "!ADD_TO_END!" in the JSON object

        If the user has no text so far, use the key "!ADD_TO_END!" and have the value be the text that you think should be added 
        to the end of the text. Never put output text in the string of text, only in the JSON object.

        Do not ever mention the JSON object in your response to the user. Your response must be 
        written in natural, plain, human-like text — strictly avoid using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. Avoid artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
    `
      : `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has asked you a question about their work.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand what the user has written so far and answer their question or provide guidance based on their request.
        
        You should only return a text response answering the user's question or addressing their request. Do not make any changes to their text.
        
        Your response must be written in natural, plain, human-like text — strictly avoid using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. Avoid artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        Do not include any other text in your response, only your answer to the user's question.
    `;

  const userPrompt = `
    Here is the current text:
    """
    ${currentText}
    """

    Here is what the user asked for:
    """
    ${instructions}
    """
  `;

  // Check premium usage for premium model
  if (userId && selectedModel === "premium") {
    try {
      const prisma = require("@/lib/prisma").default;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { premiumRemainingUses: true },
      });

      if (user && user.premiumRemainingUses > 0) {
        console.log("using premium model");
        const { OpenAI } = require("openai");
        const openAIAPIKey = process.env.OPENAI_API_KEY;
        const client = new OpenAI({ apiKey: openAIAPIKey });

        // Decrement usage
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            premiumRemainingUses: {
              decrement: 1,
            },
          },
          select: {
            premiumRemainingUses: true,
          },
        });

        const response = await client.responses.create({
          model: "gpt-4.1",
          input:
            systemPrompt +
            "\n\n" +
            userPrompt +
            "\n\n Here is the conversation history: \n" +
            JSON.stringify(history),
        });

        const updatedHistory = [
          ...history,
          { role: "user", parts: userPrompt },
          { role: "model", parts: response.output_text },
        ];

        return {
          response: response.output_text,
          updatedHistory,
          remainingUses: updatedUser.premiumRemainingUses,
        };
      }
    } catch (error) {
      console.error("Error checking/using premium model:", error);
      // Continue to Gemini API as fallback
    }
  }

  // Use Gemini if:
  // 1. Model is set to "basic"
  // 2. Model is "premium" but user has no premium uses
  console.log("using basic model");
  const genAI = new GoogleGenerativeAI(geminiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const formattedHistory = history.map((entry) => ({
    role: entry.role,
    parts: Array.isArray(entry.parts)
      ? entry.parts.map((p: string | { text: string }) =>
          typeof p === "string" ? { text: p } : p
        )
      : [{ text: entry.parts }],
  }));

  const chatSession = geminiModel.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...formattedHistory,
    ],
  });

  const result = await chatSession.sendMessage(userPrompt);
  const response = await result.response.text();

  const updatedHistory = [
    ...formattedHistory,
    { role: "user", parts: [{ text: userPrompt }] },
    { role: "model", parts: [{ text: response }] },
  ];

  return { response, updatedHistory, remainingUses: null };
}
