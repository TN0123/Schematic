import { NextResponse } from "next/server";
import { scheduleChat } from "@/scripts/schedule/chat";

export async function POST(req: Request) {
  try {
    const { instructions, history = [], userId } = await req.json();

    if (!instructions || !userId) {
      return NextResponse.json(
        { error: "Missing instructions or userId" },
        { status: 400 }
      );
    }

    const { response } = await scheduleChat(instructions, history, userId);

    return NextResponse.json({ response }, { status: 200 });
  } catch (error) {
    console.error("Error in schedule chat API:", error);
    return NextResponse.json(
      { error: "Failed to get response from AI" },
      { status: 500 }
    );
  }
}
