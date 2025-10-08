import { NextResponse } from "next/server";
import { generate } from "@/scripts/write/generate";

export async function POST(req: Request) {
  try {
    const { startText, endText, userId, model = "gpt-4.1", documentId } = await req.json();
    const result = await generate(startText, endText, userId, model, documentId);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
