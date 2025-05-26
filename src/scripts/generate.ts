export async function generate(startText: string, endText: string, userId?: string) {

  let prompt = `
  You are an AI writing assistant tasked with helping someone continue whatever text that have generated so far. 
  You will either be continuing the text at the end or in the middle of a paragraph. 
  
  If you are in the middle of a paragraph, you will be given the text that has been generated before as well as 
  the text that has been generated after. 
  
  If you are at the end of a paragraph, you will only be given the text that has been generated before.
  
  You will continue immediately where the user left off, absolutely do not repeat any of the characters in their text so far,
  only generate the continuation of their text. Try to match the user's tone as closely as possible. 
  
  Here is the text so far: ${startText} CONTINUE WRITING HERE ${endText}
  `;

  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  if (userId === "cm6qw1jxy0000unao2h2rz83l" || userId === "cma8kzffi0000unysbz2awbmf") {
    try {
      const { OpenAI } = require("openai");
      const openAIAPIKey = process.env.OPENAI_API_KEY;
      const client = new OpenAI({apiKey: openAIAPIKey});
      const response = await client.responses.create({
        model: "gpt-4.1",
        input: prompt,
      })
      return { text: response.output_text, remainingUses: null };
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      // Continue to Gemini API as fallback
    }
  }

  if (userId) {
    try {
      const prisma = require("@/lib/prisma").default;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { premiumRemainingUses: true },
      });

      if (user && user.premiumRemainingUses > 0) {
        // Try to use premium model
        const { OpenAI } = require("openai");
        const openAIAPIKey = process.env.OPENAI_API_KEY;
        const client = new OpenAI({apiKey: openAIAPIKey});
        
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
          input: prompt,
        });
        return { text: response.output_text, remainingUses: updatedUser.premiumRemainingUses };
      }
    } catch (error) {
      console.error("Error checking/using premium model:", error);
      // Continue to Gemini API as fallback
    }
  }

  // Fallback to Gemini
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const result = await model.generateContent(prompt);

  // console.log("Prompt: ", prompt);

  return { text: result.response.text(), remainingUses: null };
}
