export async function autocomplete(currentText: string) {
  let prompt = `
      Your task is to generate a small continuation of the following text. Generate a maximum of 1 additional sentence. Here is the text so far, respond with only the continuation. Absolutely do not repeat any characters from the original text.
      
      CURRENT TEXT:
      ${currentText}
    `;
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
  });

  const result = await model.generateContent(prompt);

  return result.response.text();
}
