import { NextResponse } from "next/server";
import { suggest_events } from "@/scripts/schedule/suggest-events";

export async function POST(request: Request) {
  try {
    const { userId, timezone } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!timezone) {
      return NextResponse.json({ error: "Missing timezone" }, { status: 400 });
    }

    const result = await suggest_events(userId, timezone);
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const events = JSON.parse(cleanedResult);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error suggesting events:", error);
    return NextResponse.json(
      { error: "Failed to suggest events" },
      { status: 500 }
    );
  }
}
