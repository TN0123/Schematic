import prisma from "@/lib/prisma";

export async function generate(
  startText: string,
  endText: string,
  userId?: string,
  selectedModel: "basic" | "gpt-4.1" | "claude-sonnet-4-5" = "gpt-4.1",
  documentId?: string
) {
  // Get document context if documentId is provided
  let context = "";
  if (documentId) {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { context: true },
      });
      
      context = document?.context || "";
    } catch (error) {
      console.error("Error fetching document context:", error);
      context = "";
    }
  }

  let prompt = `
  You are an AI writing assistant tasked with helping someone continue whatever text that have generated so far. 
  You will either be continuing the text at the end or in the middle of a paragraph. 

  Here is general context around what the user is working on (may be empty if the user has not written anything yet):

  BEGINNING OF CONTEXT
  ${context}
  END OF CONTEXT

  If you are in the middle of a paragraph, you will be given the text that has been generated before as well as 
  the text that has been generated after. 
  
  If you are at the end of a paragraph, you will only be given the text that has been generated before.
  
  You will continue immediately where the user left off where it says CONTINUE WRITING HERE.
  Absolutely do not repeat any of the characters in their text so far, only generate the 
  continuation of their text. Try to match the user's tone as closely as possible. 
  Generate a maximum of 2 additional sentences. 
  
  Here is the text so far: ${startText} CONTINUE WRITING HERE ${endText}
  `;

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  // Premium models: GPT-4.1 and Claude Sonnet 4
  if (userId && (selectedModel === "gpt-4.1" || selectedModel === "claude-sonnet-4-5")) {
    try {

      // Import subscription utilities
      const { canUsePremiumModel, trackPremiumUsage } = await import(
        "@/lib/subscription"
      );

      const canUse = await canUsePremiumModel(userId);

      if (canUse) {
        console.log("using premium model", selectedModel);

        // Track usage
        await trackPremiumUsage(userId);

        if (selectedModel === "gpt-4.1") {
          const { OpenAI } = require("openai");
          const openAIAPIKey = process.env.OPENAI_API_KEY;
          const client = new OpenAI({ apiKey: openAIAPIKey });
          const response = await client.responses.create({
            model: "gpt-4.1",
            input: prompt,
          });

          // Get updated usage stats
          const { getUserUsageStats } = await import("@/lib/subscription");
          const usageStats = await getUserUsageStats(userId);

          return {
            text: response.output_text,
            remainingUses: usageStats
              ? usageStats.premiumUses.limit - usageStats.premiumUses.used
              : 0,
          };
        } else {
          const { anthropic } = require("@ai-sdk/anthropic");
          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          const claudeModel = "claude-sonnet-4-5-20250929";
          const client = anthropic({ apiKey: anthropicKey });
          const response = await client.messages.create({
            model: claudeModel,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          });
          const text = (response.content || [])
            .map((c: any) => (c.type === "text" ? c.text : ""))
            .join("");

          // Get updated usage stats
          const { getUserUsageStats } = await import("@/lib/subscription");
          const usageStats = await getUserUsageStats(userId);

          return {
            text,
            remainingUses: usageStats
              ? usageStats.premiumUses.limit - usageStats.premiumUses.used
              : 0,
          };
        }
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
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);

  return { text: result.response.text(), remainingUses: null };
}
