import { NextResponse } from "next/server";
import { scheduleChat } from "@/scripts/schedule/chat";

export async function POST(req: Request) {
  try {
    const { instructions, history = [], userId, timezone } = await req.json();

    if (!instructions || !userId || !timezone) {
      return NextResponse.json(
        { error: "Missing instructions, userId, or timezone" },
        { status: 400 }
      );
    }

    const { response, contextUpdated, toolCalls } = await scheduleChat(
      instructions,
      history,
      userId,
      timezone
    );

    return NextResponse.json(
      { response, contextUpdated, toolCalls },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in schedule chat API:", error);
    return NextResponse.json(
      { error: "Failed to get response from AI" },
      { status: 500 }
    );
  }
}
