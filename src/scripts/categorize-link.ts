import { LinkPreview } from "@/app/bulletin/_components/BulletinLinkCollection";

export async function categorizeLink(categories: string[], link: LinkPreview) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require("dotenv").config();
    const geminiKey = process.env.GEMINI_API_KEY;
  
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
    const prompt = `
    
    Determine which category the following link should be added to.
    
    Here are the categories: ${JSON.stringify(categories)}
    
    Here is the link: ${JSON.stringify(link)}
    
    Return exactly the one category that the link should be added to with no additional text. You can
    add the link to an existing category or come up with a new one. There should only be one category.
    Never make the category "Uncategorized".
    
    `;
  
    const result = await model.generateContent(prompt);
  
    console.log("Prompt: ", prompt);
  
    return result.response.text();
  }
  