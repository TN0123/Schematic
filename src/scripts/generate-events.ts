export async function generate_events(text: string) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require('dotenv').config();
    const geminiKey = process.env.GEMINI_API_KEY;
  
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
    const prompt = `
      You are an AI that generates structured JSON. Convert the following text into a list of Event objects. 
      Return ONLY return a valid JSON array, absolutely nothing else. If no date is given, assume that the date is 1/28/2025.

      Each event must follow this format:
      {
        "id": "string",
        "title": "string",
        "start": "ISO8601 Date string",
        "end": "ISO8601 Date string"
      }
      
      Here is the input text: 
      ` + text;
  
    const result = await model.generateContent(prompt);
  
    return result.response.text();
  }
  