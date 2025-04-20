import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return NextResponse.json({
      message: "PDF received successfully",
      name: file.name,
      size: buffer.length,
      type: file.type,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { message: "Error processing file", error: String(error) },
      { status: 500 }
    );
  }
}
