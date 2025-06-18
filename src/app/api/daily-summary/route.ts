import { NextResponse } from "next/server";
import { daily_summary } from "@/scripts/schedule/daily-summary";

export async function POST(request: Request) {
  try {
    const { date, timezone, userId } = await request.json();

    const result = await daily_summary(new Date(date), timezone, userId);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return NextResponse.json(
      { error: "Failed to generate daily summary" },
      { status: 500 }
    );
  }
}
