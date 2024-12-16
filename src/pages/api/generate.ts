import { NextApiRequest, NextApiResponse } from "next";
import { generate } from "@/scripts/generate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { text } = req.body; 
    try {
      const result = await generate(text);
      res.status(200).json({ result });
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
