import { NextResponse } from "next/server";
import { chat } from "@/scripts/chat";

export async function POST(req: Request) {
  try {
    const { currentText, instructions } = await req.json();
    const result = await chat(currentText, instructions);
    const cleanResult = JSON.parse(result.substring(7, result.length-3));
    return NextResponse.json({ result: cleanResult }, { status: 200 });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
