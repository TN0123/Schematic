export async function generate(text: string, context: string, continueEnabled: boolean) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require('dotenv').config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = "";

  if (continueEnabled){
    prompt = "Continue the following text, only generate the remaining text and do not repeat the text already written: " + text;
  } else {
    prompt = "Improve and continue the following text: " + text;
  }

  if (context){
    if (context === "Auto"){
      prompt += "Match the current style of the text as closely as possible.";
    } else {
      prompt += "The context of this text is described as " + context;
    }
  }

  console.log("prompt: " + prompt);

  const result = await model.generateContent(prompt);

  return result.response.text();
}
