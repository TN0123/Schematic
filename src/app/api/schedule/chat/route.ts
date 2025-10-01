import { NextResponse } from "next/server";
import { scheduleChat } from "@/scripts/schedule/chat";

export async function POST(req: Request) {
  try {
    const { instructions, history = [], userId, timezone, goalsView } = await req.json();

    if (!instructions || !userId || !timezone) {
      return NextResponse.json(
        { error: "Missing instructions, userId, or timezone" },
        { status: 400 }
      );
    }

    const { response, contextUpdated, toolCalls, contextChange } =
      await scheduleChat(instructions, history, userId, timezone, goalsView);

    return NextResponse.json(
      { response, contextUpdated, toolCalls, contextChange },
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
