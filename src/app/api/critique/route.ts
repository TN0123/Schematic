import { NextResponse } from "next/server";
import { critique } from "@/scripts/critique";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const result = await critique(text);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
