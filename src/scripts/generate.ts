export async function generate(text: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require('dotenv').config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
  You are an AI writing assistant tasked with helping someone continue whatever text that have generated so far. 
  You will continue immediately where the user left off, do not repeat any of the characters in their text so far,
  only generate the continuation of their text. Try to match the user's tone as closely as possible. Here is the text 
  so far:  
  ` + text;

  const result = await model.generateContent(prompt);

  return result.response.text();
}
