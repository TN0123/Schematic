import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  // Only allow PDFs and limit size to 10MB
  const allowedMimeTypes = new Set(["application/pdf"]);
  const maxBytes = 10 * 1024 * 1024; // 10MB limit

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a valid PDF file." },
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
    // Convert file to base64 for Gemini API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type;

    // Use Gemini to extract text from PDF
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "PDF processing service not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const filePart = {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    };

    const promptText = `
      Extract all text content from this PDF document. Return only the extracted text, preserving the structure and formatting as much as possible.
      Do not add any commentary, explanations, or formatting. Just return the raw text content from the PDF.
    `;

    const prompt = {
      contents: [
        {
          role: "user",
          parts: [filePart, { text: promptText }],
        },
      ],
    };

    const result = await model.generateContent(prompt);
    const extractedText = await result.response.text();

    // Return the extracted text along with file metadata
    return NextResponse.json(
      {
        text: extractedText,
        name: file.name,
        size: file.size,
        type: file.type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF. Please try again." },
      { status: 500 }
    );
  }
}

