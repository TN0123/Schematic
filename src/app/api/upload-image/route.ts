import { NextRequest, NextResponse } from "next/server";
import { imageUpload } from "@/scripts/schedule/image-upload";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type;
    const result = await imageUpload(arrayBuffer, mimeType);
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const events = JSON.parse(cleanedResult);
    console.log("Extracted events:", events);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { message: "Failed to process image", error: (error as Error).message },
      { status: 500 }
    );
  }
}
