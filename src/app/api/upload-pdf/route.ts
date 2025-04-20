import { NextRequest, NextResponse } from "next/server";
import { pdfUpload } from "@/scripts/pdf-upload";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await pdfUpload(arrayBuffer);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { message: "Failed to process PDF", error: (error as Error).message },
      { status: 500 }
    );
  }
}
