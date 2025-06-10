import { NextResponse } from "next/server";
import { autocomplete } from "@/scripts/write/autocomplete";

export async function POST(req: Request) {
  try {
    const { currentText } = await req.json();
    const result = await autocomplete(currentText);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error autocompleting text:", error);
    return NextResponse.json(
      { error: "Failed to autocompleting text" },
      { status: 500 }
    );
  }
}
