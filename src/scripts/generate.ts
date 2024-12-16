export async function generate(text: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require('dotenv').config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = "Continue the following paragraph: " + text;

  const result = await model.generateContent(prompt);

  return result.response.text();
}
