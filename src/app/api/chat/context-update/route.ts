import { NextResponse } from "next/server";
import { contextUpdate } from "@/scripts/write/context-update";

export async function POST(req: Request) {
  try {
    const { history, documentId } = await req.json();

    if (!history || !documentId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const contextUpdateResult = await contextUpdate(history, documentId);

    return NextResponse.json(
      {
        contextUpdated: contextUpdateResult.contextUpdated,
        contextChange: contextUpdateResult.contextChange,
      },
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
