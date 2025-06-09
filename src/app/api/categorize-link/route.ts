import { NextResponse } from "next/server";
import { categorizeLink } from "@/scripts/bulletin/categorize-link";

export async function POST(req: Request) {
  try {
    const { categories, link } = await req.json();
    const result = await categorizeLink(categories, link);
    console.log("result", result);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
