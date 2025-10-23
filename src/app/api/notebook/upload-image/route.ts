import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Basic validation: only allow common image types and limit size to 10MB
  const allowedMimeTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ]);
  const maxBytes = 10 * 1024 * 1024; // 10MB limit

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a valid image (PNG, JPEG, GIF, or WebP)." },
      { status: 415 }
    );
  }

  if (typeof file.size === "number" && file.size > maxBytes) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 413 }
    );
  }

  try {
    // Convert file to base64 data URL for vision API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;


    // Return the data URL that can be used by vision models
    return NextResponse.json({ 
      url: dataUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      base64,
      mimeType
    }, { status: 200 });
  } catch (error) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { error: "Failed to process image. Please try again." },
      { status: 500 }
    );
  }
}

