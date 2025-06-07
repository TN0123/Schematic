import { NextResponse } from "next/server";
import { daily_summary } from "@/scripts/daily-summary";

export async function POST(request: Request) {
  try {
    const { existingEvents, timezone } = await request.json();

    const result = await daily_summary(existingEvents, timezone);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return NextResponse.json(
      { error: "Failed to generate daily summary" },
      { status: 500 }
    );
  }
}
