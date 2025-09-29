import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pdfUpload } from "@/scripts/schedule/pdf-upload";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  // Only allow PDFs and cap at 10MB
  const allowedMimeTypes = new Set(["application/pdf"]);
  const maxBytes = 10 * 1024 * 1024;

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json(
      { message: "Unsupported file type" },
      { status: 415 }
    );
  }

  if (typeof file.size === "number" && file.size > maxBytes) {
    return NextResponse.json(
      { message: "File too large. Max 10MB" },
      { status: 413 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await pdfUpload(arrayBuffer);
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const events = JSON.parse(cleanedResult);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { message: "Failed to process PDF", error: (error as Error).message },
      { status: 500 }
    );
  }
}
