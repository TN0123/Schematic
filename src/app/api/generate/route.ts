import { NextResponse } from "next/server";
import { generate } from "@/scripts/generate";

export async function POST(req: Request) {
  try {
    const { text, context, continueEnabled } = await req.json();
    const result = await generate(text, context, continueEnabled);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
