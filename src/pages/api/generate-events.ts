import { NextApiRequest, NextApiResponse } from "next";
import { generate_events } from "@/scripts/generate-events";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { text } = req.body; 
    try {
      const result = await generate_events(text);
      const cleanedResult = result.replace(/```json|```/g, "").trim();
      const events = JSON.parse(cleanedResult);
      res.status(200).json({ events });
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}