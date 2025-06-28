import { NextResponse } from "next/server";
import { chat } from "@/scripts/write/chat";
import { contextUpdate } from "@/scripts/write/context-update";

export async function POST(req: Request) {
  try {
    const {
      currentText,
      instructions,
      history = [],
      userId,
      documentId,
      model = "basic",
      actionMode = "edit",
    } = await req.json();
    const { response, updatedHistory, remainingUses } = await chat(
      currentText,
      instructions,
      history,
      documentId,
      userId,
      model,
      actionMode
    );

    const contextUpdateResult = await contextUpdate(updatedHistory, documentId);

    // Handle different response formats based on action mode
    if (actionMode === "ask") {
      // For "ask" mode, return the response directly as text
      return NextResponse.json(
        {
          result: response,
          history: updatedHistory,
          remainingUses,
          contextUpdated: contextUpdateResult.contextUpdated,
          contextChange: contextUpdateResult.contextChange,
        },
        { status: 200 }
      );
    } else {
      // For "edit" mode, parse JSON response as before
      if (response.includes("```json")) {
        const cleanResult = JSON.parse(
          response.substring(7, response.length - 3)
        );
        return NextResponse.json(
          {
            result: cleanResult,
            history: updatedHistory,
            remainingUses,
            contextUpdated: contextUpdateResult.contextUpdated,
            contextChange: contextUpdateResult.contextChange,
          },
          { status: 200 }
        );
      }
      const cleanResult = JSON.parse(response);
      return NextResponse.json(
        {
          result: cleanResult,
          history: updatedHistory,
          remainingUses,
          contextUpdated: contextUpdateResult.contextUpdated,
          contextChange: contextUpdateResult.contextChange,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
