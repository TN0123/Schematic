import { NextResponse } from "next/server";
import { improve } from "@/scripts/improve";

export async function POST(req: Request) {
  try {
    const { before, selected, after } = await req.json();
    const response = await improve(before, selected, after);
    const cleanResult = JSON.parse(response.substring(7, response.length - 3));

    return NextResponse.json({ result: cleanResult }, { status: 200 });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
