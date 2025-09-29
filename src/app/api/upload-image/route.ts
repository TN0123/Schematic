import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { imageUpload } from "@/scripts/schedule/image-upload";

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

  // Basic validation: only allow common image types and limit size to 5MB
  const allowedMimeTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ]);
  const maxBytes = 5 * 1024 * 1024;

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json(
      { message: "Unsupported file type" },
      {
        status: 415,
      }
    );
  }

  if (typeof file.size === "number" && file.size > maxBytes) {
    return NextResponse.json(
      { message: "File too large. Max 5MB" },
      { status: 413 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type;
    const result = await imageUpload(arrayBuffer, mimeType);
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const events = JSON.parse(cleanedResult);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { message: "Failed to process image", error: (error as Error).message },
      { status: 500 }
    );
  }
}
