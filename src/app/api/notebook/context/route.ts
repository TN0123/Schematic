import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 }
    );
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { context: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { context: document.context || "" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching context:", error);
    return NextResponse.json(
      { error: "Failed to fetch context" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { documentId, context } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    if (context === undefined || context === null) {
      return NextResponse.json(
        { error: "context is required" },
        { status: 400 }
      );
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { context },
    });

    return NextResponse.json(
      { context: updatedDocument.context },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating context:", error);
    return NextResponse.json(
      { error: "Failed to update context" },
      { status: 500 }
    );
  }
}
