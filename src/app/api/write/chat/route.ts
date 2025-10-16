import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { PrismaClient } from "@prisma/client";
import { contextUpdate } from "@/scripts/write/context-update";
import { canUsePremiumModel, trackPremiumUsage } from "@/lib/subscription";

const prisma = new PrismaClient();

// Diff-based function to generate change map from original and new text
function generateChangeMapFromDiff(
  originalText: string,
  newText: string
): Record<string, string> {
  // If texts are identical, no changes
  if (originalText === newText) {
    return {};
  }

  // Special case: if original is empty, use !ADD_TO_END! marker
  if (originalText.trim() === "") {
    return { "!ADD_TO_END!": newText };
  }

  // Strategy: find common prefix and suffix, then create a single replacement
  let prefixEnd = 0;
  const minLength = Math.min(originalText.length, newText.length);

  // Find common prefix
  while (
    prefixEnd < minLength &&
    originalText[prefixEnd] === newText[prefixEnd]
  ) {
    prefixEnd++;
  }

  // Find common suffix
  let suffixStart = 0;
  while (
    suffixStart < minLength - prefixEnd &&
    originalText[originalText.length - 1 - suffixStart] ===
      newText[newText.length - 1 - suffixStart]
  ) {
    suffixStart++;
  }

  // Extract the changed portion
  const originalChanged = originalText.slice(
    prefixEnd,
    originalText.length - suffixStart
  );
  const newChanged = newText.slice(
    prefixEnd,
    newText.length - suffixStart
  );

  // If no change detected (shouldn't happen given earlier check), return empty
  if (originalChanged === newChanged) {
    return {};
  }

  // Special case: if we're only appending to the end
  if (originalChanged === "" && prefixEnd === originalText.length) {
    return { "!ADD_TO_END!": newChanged };
  }

  // Create a replacement mapping
  return { [originalChanged]: newChanged };
}

export async function POST(req: NextRequest) {
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

    

    // Get document context
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { context: true },
    });

    const context = document?.context;

    // Select model and check usage
    let selectedModelProvider = google("gemini-2.5-flash");
    let remainingUses: number | null = null;

    // Support explicit model selection: "basic" | "gpt-4.1" | "claude-sonnet-4"
    if ((model === "gpt-4.1" || model === "claude-sonnet-4") && userId) {
      try {
        // Check if user can use premium models
        const usageCheck = await canUsePremiumModel(userId);

        if (usageCheck.allowed) {
          if (model === "gpt-4.1") {
            selectedModelProvider = openai("gpt-4.1");
          } else if (model === "claude-sonnet-4") {
            const anthropicModelId = "claude-4-sonnet-20250514";
            selectedModelProvider = anthropic(anthropicModelId);
          }

          // Track the usage
          const usageResult = await trackPremiumUsage(userId);
          remainingUses = usageResult.remainingUses;
        } else {
          // Fall back to Gemini if limit reached
          selectedModelProvider = google("gemini-2.5-flash");
          console.log(`Premium model denied: ${usageCheck.reason}`);
        }
      } catch (error) {
        console.error("Error checking premium usage:", error);
        // Fall back to Gemini
        selectedModelProvider = google("gemini-2.5-flash");
      }
    } else {
      // Use Gemini for basic model
      selectedModelProvider = google("gemini-2.5-flash");
    }

    if (actionMode === "ask") {
      // ASK MODE: Simple streaming text response
      const systemPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has asked you a question about their work.

        Here is general context around what the user is working on (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand what the user has written so far and answer their question or provide guidance based on their request.
        
        You should only return a text response answering the user's question or addressing their request. Do not make any changes to their text.
        
        Your response MUST be written in natural, plain, human-like text — STRICTLY AVOID using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. AVOID artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        DO NOT include any other text in your response, only your answer to the user's question.
      `;

      const userPrompt = `
        Here is the current text:
        """
        ${currentText}
        """

        Here is what the user asked for:
        """
        ${instructions}
        """
      `;

      const uiMessages = [
        {
          role: "system" as const,
          parts: [{ type: "text", text: systemPrompt }],
        },
        ...history.map((entry: any) => {
          const role = (entry.role === "model" ? "assistant" : entry.role) as
            | "user"
            | "assistant";

          let textContent = "";
          if (typeof entry.parts === "string") {
            textContent = entry.parts;
          } else if (Array.isArray(entry.parts)) {
            textContent = entry.parts
              .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
              .join("");
          } else if (entry.parts && typeof entry.parts === "object") {
            textContent = entry.parts.text ?? String(entry.parts);
          }

          return { role, parts: [{ type: "text", text: textContent }] };
        }),
        { role: "user" as const, parts: [{ type: "text", text: userPrompt }] },
      ];

      const messages = convertToModelMessages(uiMessages);

      const result = await streamText({
        model: selectedModelProvider,
        messages,
      });

      let fullResponse = "";
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (eventType: string, data: any) => {
            const sseData = `event: ${eventType}\ndata: ${JSON.stringify(
              data
            )}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          };

          try {
            sendEvent("status", { message: "Starting AI processing..." });

            // Stream text deltas
            for await (const delta of result.textStream) {
              fullResponse += delta;
              sendEvent("assistant-delta", { delta });
            }

            sendEvent("assistant-complete", { text: fullResponse });

            // Update conversation history
            const updatedHistory = [
              ...history,
              { role: "user", parts: userPrompt },
              { role: "model", parts: fullResponse },
            ];

            // Update context
            sendEvent("status", { message: "Updating context..." });
            let contextUpdateResult;
            try {
              contextUpdateResult = await contextUpdate(
                updatedHistory,
                documentId
              );
            } catch (error) {
              console.error("Context update failed:", error);
              contextUpdateResult = {
                contextUpdated: false,
                contextChange: null,
              };
            }

            sendEvent("result", {
              result: fullResponse,
              history: updatedHistory,
              remainingUses,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "ask",
            });

            sendEvent("complete", { message: "Processing complete" });
            
          } catch (error) {
            
            sendEvent("error", {
              error: "Failed to generate content",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } else {
      // EDIT MODE: Stream new document text + generate diff-based change map
      const documentEditPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested changes.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand the user's request and generate the complete new version of their document that incorporates the requested changes.
        
        Rules:
        1. If the document is currently empty and the user wants you to create new content, generate the new content from scratch.
        2. If the document has existing text and the user wants edits, generate the full document with the edits applied.
        3. If the user wants to add content, include both the existing text and the new content in the appropriate location.
        4. If the user wants to delete something, generate the document without that content.
        5. Preserve the parts of the document that should remain unchanged.
        6. Do NOT include explanations, comments, or meta-text. ONLY return the document text itself.
        
        Your output MUST be written in natural, plain, human-like text — STRICTLY AVOID using Markdown formatting such 
        as **bold**, _italics_, or any other markup UNLESS the original document uses them. DO NOT format text using asterisks, underscores, 
        or similar characters unless they were already in the original document. AVOID artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        Return ONLY the complete new version of the document, nothing else.
      `;

      const userPrompt = `
        Here is the current text:
        """
        ${currentText}
        """

        Here is what the user asked for:
        """
        ${instructions}
        """
      `;

      const uiMessages = [
        {
          role: "system" as const,
          parts: [{ type: "text", text: documentEditPrompt }],
        },
        ...history.map((entry: any) => {
          const role = (entry.role === "model" ? "assistant" : entry.role) as
            | "user"
            | "assistant";

          let textContent = "";
          if (typeof entry.parts === "string") {
            textContent = entry.parts;
          } else if (Array.isArray(entry.parts)) {
            textContent = entry.parts
              .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
              .join("");
          } else if (entry.parts && typeof entry.parts === "object") {
            textContent = entry.parts.text ?? String(entry.parts);
          }

          return { role, parts: [{ type: "text", text: textContent }] };
        }),
        { role: "user" as const, parts: [{ type: "text", text: userPrompt }] },
      ];

      const messages = convertToModelMessages(uiMessages);
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (eventType: string, data: any) => {
            const sseData = `event: ${eventType}\ndata: ${JSON.stringify(
              data
            )}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          };

          try {
            sendEvent("status", { message: "Starting AI processing..." });

            // Generate the new document text (not streamed to avoid confusion)
            const result = await streamText({
              model: selectedModelProvider,
              messages,
            });

            let newDocumentText = "";
            for await (const delta of result.textStream) {
              newDocumentText += delta;
            }

            // Generate change map using diff-based approach
            sendEvent("status", { message: "Generating changes..." });
            const changeMap = generateChangeMapFromDiff(currentText, newDocumentText);

            sendEvent("changes-final", { changes: changeMap });

            // Generate a brief summary for the chat UI
            const summaryPrompt = `Based on the user's request: "${instructions}", provide a brief 1-2 sentence summary of what changes were made to the document. Be concise and friendly. Your response MUST be written in natural, plain text without any Markdown formatting.`;
            
            const summaryResult = await streamText({
              model: selectedModelProvider,
              prompt: summaryPrompt,
            });

            let assistantSummary = "";
            for await (const delta of summaryResult.textStream) {
              assistantSummary += delta;
              sendEvent("assistant-delta", { delta });
            }

            sendEvent("assistant-complete", { text: assistantSummary });

            // Update conversation history with the summary
            const updatedHistory = [
              ...history,
              { role: "user", parts: userPrompt },
              { role: "model", parts: assistantSummary },
            ];

            // Update context
            sendEvent("status", { message: "Updating context..." });
            let contextUpdateResult;
            try {
              contextUpdateResult = await contextUpdate(
                updatedHistory,
                documentId
              );
            } catch (error) {
              contextUpdateResult = {
                contextUpdated: false,
                contextChange: null,
              };
            }

            sendEvent("result", {
              result: [assistantSummary, {}],
              history: updatedHistory,
              remainingUses,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "edit",
            });

            sendEvent("complete", { message: "Processing complete" });
          } catch (error) {
            sendEvent("error", {
              error: "Failed to generate content",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
  } catch (error) {
    
    return new Response(
      JSON.stringify({ error: "Failed to start streaming" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
