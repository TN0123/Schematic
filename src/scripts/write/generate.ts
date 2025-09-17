export async function generate(
  startText: string,
  endText: string,
  userId?: string,
  selectedModel: "basic" | "gpt-4.1" | "claude-sonnet-4" = "gpt-4.1"
) {
  let prompt = `
  You are an AI writing assistant tasked with helping someone continue whatever text that have generated so far. 
  You will either be continuing the text at the end or in the middle of a paragraph. 
  
  If you are in the middle of a paragraph, you will be given the text that has been generated before as well as 
  the text that has been generated after. 
  
  If you are at the end of a paragraph, you will only be given the text that has been generated before.
  
  You will continue immediately where the user left off where it says CONTINUE WRITING HERE.
  Absolutely do not repeat any of the characters in their text so far, only generate the 
  continuation of their text. Try to match the user's tone as closely as possible. 
  
  Here is the text so far: ${startText} CONTINUE WRITING HERE ${endText}
  `;

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  // Premium models: GPT-4.1 and Claude Sonnet 4
  if (userId && (selectedModel === "gpt-4.1" || selectedModel === "claude-sonnet-4")) {
    try {
      const prisma = require("@/lib/prisma").default;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { premiumRemainingUses: true },
      });

      if (user && user.premiumRemainingUses > 0) {
        console.log("using premium model", selectedModel);

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

        if (selectedModel === "gpt-4.1") {
          const { OpenAI } = require("openai");
          const openAIAPIKey = process.env.OPENAI_API_KEY;
          const client = new OpenAI({ apiKey: openAIAPIKey });
          const response = await client.responses.create({
            model: "gpt-4.1",
            input: prompt,
          });
          return {
            text: response.output_text,
            remainingUses: updatedUser.premiumRemainingUses,
          };
        } else {
          const Anthropic = require("@anthropic-ai/sdk").default;
          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          const claudeModel = "claude-4-sonnet-20250514";
          const client = new Anthropic({ apiKey: anthropicKey });
          const response = await client.messages.create({
            model: claudeModel,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          });
          const text = (response.content || [])
            .map((c: any) => (c.type === "text" ? c.text : ""))
            .join("");
          return {
            text,
            remainingUses: updatedUser.premiumRemainingUses,
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
