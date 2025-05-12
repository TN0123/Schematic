export async function generate(startText: string, endText: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  let prompt = `
  You are an AI writing assistant tasked with helping someone continue whatever text that have generated so far. 
  You will either be continuing the text at the end or in the middle of a paragraph. 
  
  If you are in the middle of a paragraph, you will be given the text that has been generated before as well as 
  the text that has been generated after. 
  
  If you are at the end of a paragraph, you will only be given the text that has been generated before.
  
  You will continue immediately where the user left off, do not repeat any of the characters in their text so far,
  only generate the continuation of their text. Try to match the user's tone as closely as possible. 
  
  Here is the text so far: ${startText} CONTINUE WRITING HERE ${endText}
  `;

  const result = await model.generateContent(prompt);

  // console.log("Prompt: ", prompt);

  return result.response.text();
}
