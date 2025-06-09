import { NextResponse } from "next/server";
import { generate_events } from "@/scripts/schedule/generate-events";

export async function POST(req: Request) {
  try {
    const { text, timezone } = await req.json();
    const result = await generate_events(text, timezone);

    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const events = JSON.parse(cleanedResult);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error generating events:", error);
    return NextResponse.json(
      { error: "Failed to generate events" },
      { status: 500 }
    );
  }
}
