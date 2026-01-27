import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { scheduleChat } from "@/scripts/schedule/chat";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { instructions, history = [], userId, timezone, goalsView } = await req.json();

    if (!instructions || !userId || !timezone) {
      return NextResponse.json(
        { error: "Missing instructions, userId, or timezone" },
        { status: 400 }
      );
    }

    // Ensure the user is only chatting as themselves
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
