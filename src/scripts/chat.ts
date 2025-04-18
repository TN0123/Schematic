export async function chat(currentText: string, instructions: string) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require('dotenv').config();
    const geminiKey = process.env.GEMINI_API_KEY;
  
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
    const prompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested something of you

        Your job is to understand what the user has written so far and help the user improve, edit, expand, condense, rewrite, or otherwise 
        modify the content accordingly. 
        
        Your job is to return an array of two items:
            1. A string of text responding to what the user said to you.
            2. a JSON object that contains the changes that should be made to the original text.

        The JSON object must have the following properties:
        - each key is a snippet or section from the original text that you think should be replaced with new text
        - each value is the new text that should replace the original text
        - only include parts of the text that need to be changed, do not include any text that does not need to be changed
        - if you want to add text to the end of the original text, use the key "!ADD_TO_END!" and have the value as the text to add

        If the text is long, break up the suggested changes into multiple changes, try to not make a single change be too long.
        However, never use more than one key "!ADD_TO_END!" in the JSON object.

        If the user has no text so far, use the key "!ADD_TO_END!" and have the value be the text that you think should be added 
        to the end of the text. Never put output text in the string of text, only in the JSON object.

        Here is the current text:
        """
        ${currentText}
        """

        Here is what the user asked for:
        """
        ${instructions}
        """

        Please generate the array of the string of text and the JSON object as described above.
        Do not include any other text in your response, only the array of two items.

        Do not ever mention the JSON object in your response to the user. Your response must be 
        written in natural, plain, human-like text — strictly avoid using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. Avoid artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
    `;
  
    const result = await model.generateContent(prompt);
  
    return result.response.text();
  }
  