export async function improve(before: string, selected: string, after: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let prompt = `
    You are an AI writing assistant. Your tasks is to improve quality of the following text for the user.
    You will be provided with text that the user wants to change as well as some surrounding context to help you 
    understand the text better. Only change the text that the user wants to change, do not change any other text.
    Do not change the meaning of the text, just improve it. If the text is a snippet of a larger text, 
    make it flow better with the rest of the text.

    CURRENT TEXT: 
    ${before}

    BEGINNING OF TEXT TO IMPROVE 
    ${selected}
    END OF TEXT TO IMPROVE
    
    ${after}



    You must return a JSON object with the changes that should be made to the original text.

    The JSON object must have the following properties:
        - each key is a snippet or section from the text to improve that you think should be replaced with new text
        - each value is the new text that should replace the original text
        - only include parts of the text that need to be changed, do not include any text that does not need to be changed
        - only change the text that the user wants to change, do not change any other text.
    
    Do not include any other text in your response, only the JSON object.
    `;

  const result = await model.generateContent(prompt);

  console.log("Prompt: ", prompt);

  return result.response.text();
}
