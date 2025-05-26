import { NextResponse } from "next/server";
import { improve } from "@/scripts/improve";

export async function POST(req: Request) {
  try {
    const { before, selected, after, userId } = await req.json();
    const { response, remainingUses } = await improve(before, selected, after, userId);
    if (response.includes("```json")) {
      const cleanResult = JSON.parse(response.substring(7, response.length - 3));
      return NextResponse.json(
        { result: cleanResult, remainingUses },
        { status: 200 }
      );
    }
    const cleanResult = JSON.parse(response);
    return NextResponse.json(
      { result: cleanResult, remainingUses },
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
