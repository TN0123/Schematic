import { NextResponse } from "next/server";
import { chat } from "@/scripts/chat";

export async function POST(req: Request) {
  try {
    const { currentText, instructions, history = [] } = await req.json();
    const { response, updatedHistory } = await chat(
      currentText,
      instructions,
      history
    );

    const cleanResult = JSON.parse(response.substring(7, response.length - 3));
    return NextResponse.json(
      { result: cleanResult, history: updatedHistory },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
