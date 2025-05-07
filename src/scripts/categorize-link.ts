import { LinkPreview } from "@/app/bulletin/_components/BulletinLinkCollection";

export async function categorizeLink(categories: string[], link: LinkPreview) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require("dotenv").config();
    const geminiKey = process.env.GEMINI_API_KEY;
  
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
    const prompt = `
    
    You will be given a link and a list of categories, your job is to determine which category
    is most relevant to the link. If none of the categories are relevant, create a new category
    with a name that is relevant to the link.
    
    Here are the categories: ${JSON.stringify(categories)}
    
    Here is the link: ${JSON.stringify(link)}
    
    Return exactly the one category that the link should be added to with no additional text.
    Never make the category "Uncategorized".
    
    `;
  
    const result = await model.generateContent(prompt);
  
    console.log("Prompt: ", prompt);
  
    return result.response.text();
  }
  