import { NextResponse } from "next/server";
import { chat } from "@/scripts/chat";

export async function POST(req: Request) {
  try {
    const { currentText, instructions, history = [], userId } = await req.json();
    const { response, updatedHistory, remainingUses } = await chat(
      currentText,
      instructions,
      history,
      userId
    );

    if (response.includes("```json")) {
      const cleanResult = JSON.parse(response.substring(7, response.length - 3));
      return NextResponse.json(
        { result: cleanResult, history: updatedHistory, remainingUses },
        { status: 200 }
      );
    }
    const cleanResult = JSON.parse(response);
    return NextResponse.json(
      { result: cleanResult, history: updatedHistory, remainingUses },
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
