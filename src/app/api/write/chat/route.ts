import { NextRequest } from "next/server";
import { streamText, generateObject, convertToModelMessages } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { PrismaClient } from "@prisma/client";
import { contextUpdate } from "@/scripts/write/context-update";
import { canUsePremiumModel, trackPremiumUsage } from "@/lib/subscription";

const prisma = new PrismaClient();

// Schema for change map generation
const changeMapSchema = z.object({
  changes: z
    .array(
      z.object({
        original: z.string().describe("The original text to replace, or '!ADD_TO_END!' to append new content"),
        replacement: z.string().describe("The new text to replace the original with"),
      })
    )
    .describe("An array of text replacements to apply to the document"),
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
      // EDIT MODE: Stream assistant text + generate change map JSON
      const assistantTextPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested something of you.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to provide a brief, friendly response to the user explaining what changes you're making to their text.
        
        Your response should be conversational and helpful, explaining your approach or reasoning.
        
        Your response MUST be written in natural, plain, human-like text — STRICTLY AVOID using Markdown formatting such 
        as **bold**, _italics_, or any other markup. DO NOT format text using asterisks, underscores, 
        or similar characters. AVOID artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        Keep your response concise (2-3 sentences maximum).
      `;

      const changeMapPrompt = `
        You are an AI writing assistant that generates precise text edit instructions. A user is working on a document and has requested changes.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to analyze the current text and the user's request, then generate an array of changes.
        
        Each change has an "original" field (the text to replace) and a "replacement" field (the new text).
        
        Rules for generating changes:
        1. If the user's document is empty and they want you to create new content, use "!ADD_TO_END!" as the original and the new content as the replacement
        2. If you need to append new content to the end of existing text, use "!ADD_TO_END!" as the original and the content to append as the replacement
        3. For edits/replacements, use the EXACT original text snippet as the original, and the replacement text as the replacement
        4. Choose text snippets that are unique enough to be found in the document (include enough context)
        5. If replacing multiple separate sections, create multiple change objects in the array
        6. Keep the snippets focused on what actually needs to change - don't include large unchanged portions
        7. If the user asks you to delete something, use the original text as original and an empty string "" as replacement
        
        Example changes array:
        - Adding to empty document: [{"original": "!ADD_TO_END!", "replacement": "This is the new content the user requested."}]
        - Replacing text: [{"original": "The quick brown fox", "replacement": "The swift red fox"}]
        - Multiple changes: [{"original": "old sentence 1", "replacement": "new sentence 1"}, {"original": "old sentence 2", "replacement": "new sentence 2"}]
        - Appending: [{"original": "!ADD_TO_END!", "replacement": "\\n\\nThis is new content at the end."}]
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

            // Start both tasks in parallel
            // 1. Stream assistant text (for user to see)
            const assistantMessagesUI = [
              {
                role: "system" as const,
                parts: [{ type: "text", text: assistantTextPrompt }],
              },
              ...uiMessages,
            ];
            const assistantMessages = convertToModelMessages(assistantMessagesUI);

            // 2. Generate change map JSON (not streamed)
            const changeMapMessagesUI = [
              {
                role: "system" as const,
                parts: [{ type: "text", text: changeMapPrompt }],
              },
              ...uiMessages,
            ];
            const changeMapMessages = convertToModelMessages(changeMapMessagesUI);

            const changeMapPromise = generateObject({
              model: selectedModelProvider,
              messages: changeMapMessages,
              schema: changeMapSchema,
            });

            let assistantFullText = "";

            // Start streaming assistant text immediately (don't create promise wrapper)
            
            let deltaCount = 0;
            
            const assistantStreamPromise = (async () => {
              try {
                const result = await streamText({
                  model: selectedModelProvider,
                  messages: assistantMessages,
                });

                for await (const delta of result.textStream) {
                  assistantFullText += delta;
                  deltaCount++;
                  
                  sendEvent("assistant-delta", { delta });
                }
                
                
                sendEvent("assistant-complete", { text: assistantFullText });
              } catch (error) {
                
                throw error;
              }
            })();

            // Wait for change map to be ready
            const changeMapGenPromise = (async () => {
              const changeMapResult = await changeMapPromise;
              const changesArray = changeMapResult.object.changes;
              
              // Convert array format to Record<string, string> format expected by frontend
              const changeMap: Record<string, string> = {};
              for (const change of changesArray) {
                changeMap[change.original] = change.replacement;
              }
              
              sendEvent("changes-final", { changes: changeMap });
            })();

            // Wait for both to complete
            await Promise.all([assistantStreamPromise, changeMapGenPromise]);

            // Update conversation history with the assistant's response
            const updatedHistory = [
              ...history,
              { role: "user", parts: userPrompt },
              { role: "model", parts: assistantFullText },
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
              result: [assistantFullText, {}],
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
