import { NextResponse } from "next/server";
import { generate } from "@/scripts/generate";

export async function POST(req: Request) {
  try {
    const { startText, endText } = await req.json();
    const result = await generate(startText, endText);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
