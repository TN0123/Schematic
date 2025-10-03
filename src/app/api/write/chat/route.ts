import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { PrismaClient } from "@prisma/client";
import { contextUpdate } from "@/scripts/write/context-update";

const prisma = new PrismaClient();

// Normalize escaped sequences like \n, \r, \t into actual characters
function normalizeEscapedSequences(input: string): string {
  if (typeof input !== "string" || input.length === 0) return input;
  return input
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

// Recursively normalize all string fields within an object/array
function deepNormalizeEscapedSequences<T>(value: T): T {
  if (typeof value === "string") {
    return normalizeEscapedSequences(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepNormalizeEscapedSequences(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = normalizeEscapedSequences(key);
      result[normalizedKey] = deepNormalizeEscapedSequences(val);
    }
    return result as unknown as T;
  }
  return value;
}

// Simple diff-based fallback to generate change map from original and revised text
function generateChangeMapFromDiff(
  originalText: string,
  revisedText: string
): Record<string, string> {
  // If texts are identical, no changes
  if (originalText === revisedText) {
    return {};
  }

  // If original is empty, add everything to the end
  if (!originalText || originalText.trim() === "") {
    return { "!ADD_TO_END!": revisedText };
  }

  // If revised is empty or significantly shorter, it's likely a deletion scenario
  if (!revisedText || revisedText.trim() === "") {
    return { [originalText]: "" };
  }

  // Strategy: find common prefix and suffix, then create a single replacement
  let prefixEnd = 0;
  const minLength = Math.min(originalText.length, revisedText.length);

  // Find common prefix
  while (
    prefixEnd < minLength &&
    originalText[prefixEnd] === revisedText[prefixEnd]
  ) {
    prefixEnd++;
  }

  // Find common suffix
  let suffixStart = 0;
  while (
    suffixStart < minLength - prefixEnd &&
    originalText[originalText.length - 1 - suffixStart] ===
      revisedText[revisedText.length - 1 - suffixStart]
  ) {
    suffixStart++;
  }

  // Extract the changed portion
  const originalChanged = originalText.slice(
    prefixEnd,
    originalText.length - suffixStart
  );
  const revisedChanged = revisedText.slice(
    prefixEnd,
    revisedText.length - suffixStart
  );

  // If no change detected (shouldn't happen given earlier check), return empty
  if (originalChanged === revisedChanged) {
    return {};
  }

  // If original changed part is empty, we're adding at a position
  if (originalChanged === "") {
    return { "!ADD_TO_END!": revisedChanged };
  }

  // Otherwise, create a replacement mapping
  return { [originalChanged]: revisedChanged };
}

// Schema for structured change generation
const changeSchema = z.object({
  revisedText: z
    .string()
    .describe(
      "The complete revised version of the user's text with all changes applied"
    ),
});

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

    console.log(
      `[CHAT] Dual-stream request started - Model: ${model}, Action: ${actionMode}, User: ${userId?.substring(
        0,
        8
      )}...`
    );

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
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { premiumRemainingUses: true },
        });

        if (user && user.premiumRemainingUses > 0) {
          if (model === "gpt-4.1") {
            selectedModelProvider = openai("gpt-4.1");
          } else if (model === "claude-sonnet-4") {
            const anthropicModelId = "claude-4-sonnet-20250514";
            selectedModelProvider = anthropic(anthropicModelId);
          }

          // Decrement usage
          const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
              premiumRemainingUses: {
                decrement: 1,
              },
            },
            select: {
              premiumRemainingUses: true,
            },
          });

          remainingUses = updatedUser.premiumRemainingUses;
        } else {
          // Fall back to Gemini
          selectedModelProvider = google("gemini-2.5-flash");
          console.log("Using Gemini Flash (fallback - no premium uses remaining)");
        }
      } catch (error) {
        console.error("Error checking premium usage:", error);
        // Fall back to Gemini
        selectedModelProvider = google("gemini-2.5-flash");
        console.log("Using Gemini Flash (fallback - error checking premium)");
      }
    } else {
      // Use Gemini for basic model
      selectedModelProvider = google("gemini-2.5-flash");
      console.log("Using Gemini Flash (basic model)");
    }

    if (actionMode === "ask") {
      // ASK MODE: Simple streaming text response (no changes needed)
      const systemPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has asked you a question about their work.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand what the user has written so far and answer their question or provide guidance based on their request.
        
        You should only return a text response answering the user's question or addressing their request. Do not make any changes to their text.
        
        Your response must be written in natural, plain, human-like text — strictly avoid using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. Avoid artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        Do not include any other text in your response, only your answer to the user's question.
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
      temperature: 0.7,
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

          const cleanFullResponse = normalizeEscapedSequences(fullResponse);

          // Update conversation history
          const updatedHistory = [
            ...history,
            { role: "user", parts: userPrompt },
            { role: "model", parts: cleanFullResponse },
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
              result: cleanFullResponse,
              history: updatedHistory,
              remainingUses,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "ask",
            });

            sendEvent("complete", { message: "Processing complete" });
            console.log(`[CHAT] Ask mode completed - Model: ${model}`);
          } catch (error) {
            console.error("[CHAT] Error in ask mode streaming:", error);
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
      // EDIT MODE: Dual-stream architecture
      // Stream 1: User-visible assistant text
      // Stream 2: Structured change generation (parallel)

      const assistantTextPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested something of you.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to provide a brief, friendly response to the user explaining what changes you're making to their text.
        
        Your response should be conversational and helpful, explaining your approach or reasoning.
        
        Your response must be written in natural, plain, human-like text — strictly avoid using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. Avoid artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        Keep your response concise (2-3 sentences maximum).
      `;

      const revisedTextPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested something of you.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand what the user has written so far and help the user improve, edit, expand, condense, rewrite, or otherwise 
        modify the content accordingly.
        
        You must return the COMPLETE revised version of the user's text with all requested changes applied.
        
        If the user has no text so far, return the new text that should be created.
        
        Return ONLY the revised text, without any explanations, comments, or formatting.
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

            // PARALLEL STREAM 1: Assistant text (for user to see)
            const assistantMessagesUI = [
              {
                role: "system" as const,
                parts: [{ type: "text", text: assistantTextPrompt }],
              },
              ...uiMessages,
            ];
            const assistantMessages = convertToModelMessages(assistantMessagesUI);

            const assistantTextStream = streamText({
              model: selectedModelProvider,
              messages: assistantMessages,
              temperature: 0.7,
            });

            // PARALLEL STREAM 2: Revised text generation (for change map)
            const revisedMessagesUI = [
              {
                role: "system" as const,
                parts: [{ type: "text", text: revisedTextPrompt }],
              },
              ...uiMessages,
            ];
            const revisedMessages = convertToModelMessages(revisedMessagesUI);

            const revisedTextPromise = streamText({
              model: selectedModelProvider,
              messages: revisedMessages,
              temperature: 0.7,
            });

            // Start both streams concurrently
            const [assistantResult, revisedResult] = await Promise.all([
              assistantTextStream,
              revisedTextPromise,
            ]);

            let assistantFullText = "";
            let revisedFullText = "";

            // Stream assistant text deltas to frontend immediately
            const assistantStreamPromise = (async () => {
              for await (const delta of assistantResult.textStream) {
                assistantFullText += delta;
                sendEvent("assistant-delta", { delta });
              }
              sendEvent("assistant-complete", { text: assistantFullText });
            })();

            // Collect revised text in background and send changes as soon as ready
            const revisedStreamPromise = (async () => {
              for await (const delta of revisedResult.textStream) {
                revisedFullText += delta;
              }
              
              // Generate and send changes immediately after revised text completes
              // Don't wait for assistant text
              sendEvent("status", { message: "Generating changes..." });
              
              const cleanRevisedText = normalizeEscapedSequences(revisedFullText);
              const changeMap = generateChangeMapFromDiff(
                currentText,
                cleanRevisedText
              );
              const normalizedChangeMap = deepNormalizeEscapedSequences(changeMap);
              
              sendEvent("changes-final", { changes: normalizedChangeMap });
            })();

            // Wait for both to complete
            await Promise.all([assistantStreamPromise, revisedStreamPromise]);

            // Normalize assistant text for history
            const cleanAssistantText =
              normalizeEscapedSequences(assistantFullText);

            // Update conversation history with the assistant's response
            const updatedHistory = [
              ...history,
              { role: "user", parts: userPrompt },
              { role: "model", parts: cleanAssistantText },
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
              result: [cleanAssistantText, {}],
              history: updatedHistory,
              remainingUses,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "edit",
            });

          sendEvent("complete", { message: "Processing complete" });
            console.log(`[CHAT] Edit mode dual-stream completed - Model: ${model}`);
        } catch (error) {
            console.error("[CHAT] Error in edit mode streaming:", error);
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
    console.error("Error setting up streaming:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start streaming" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
