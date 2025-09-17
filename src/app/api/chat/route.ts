import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { PrismaClient } from "@prisma/client";
import { contextUpdate } from "@/scripts/write/context-update";

const prisma = new PrismaClient();

// Robust function to parse LLM response with multiple fallback strategies
function parseAIResponse(response: string): [string, any] {
  // Strategy 1: Try to parse as direct JSON array
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [parsed[0], parsed[1]];
    }
  } catch (error) {
    // Continue to next strategy
  }

  // Strategy 2: Handle responses wrapped in ```json blocks
  if (response.includes("```json")) {
    try {
      const jsonStart = response.indexOf("```json") + 7;
      const jsonEnd = response.lastIndexOf("```");
      const jsonContent = response.slice(jsonStart, jsonEnd).trim();
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return [parsed[0], parsed[1]];
      }
    } catch (error) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Extract array-like content using regex
  try {
    const arrayMatch = response.match(/\[\s*"[^"]*",\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      const cleanedContent = arrayMatch[0]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      const parsed = JSON.parse(cleanedContent);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return [parsed[0], parsed[1]];
      }
    }
  } catch (error) {
    // Continue to next strategy
  }

  // Strategy 4: Try to extract manually using string manipulation
  try {
    const lines = response.split("\n");
    let insideArray = false;
    let arrayContent = "";
    let bracketCount = 0;

    for (const line of lines) {
      if (line.trim().startsWith("[")) {
        insideArray = true;
        arrayContent += line + "\n";
        bracketCount += (line.match(/\[/g) || []).length;
        bracketCount -= (line.match(/\]/g) || []).length;
      } else if (insideArray) {
        arrayContent += line + "\n";
        bracketCount += (line.match(/\[/g) || []).length;
        bracketCount -= (line.match(/\]/g) || []).length;

        if (bracketCount <= 0 && line.includes("]")) {
          break;
        }
      }
    }

    if (arrayContent) {
      const parsed = JSON.parse(arrayContent.trim());
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return [parsed[0], parsed[1]];
      }
    }
  } catch (error) {
    // Continue to fallback
  }

  // Strategy 5: Extract using more aggressive regex patterns
  try {
    // Look for the message part (first string in quotes)
    const messageMatch = response.match(/"([^"]+(?:\\"[^"]*)*)",/);
    const message = messageMatch
      ? messageMatch[1].replace(/\\"/g, '"')
      : "AI response could not be parsed properly.";

    // Look for JSON object pattern after the message
    const objMatch = response.match(/\{[\s\S]*\}/);
    if (objMatch) {
      let jsonStr = objMatch[0];

      // Try to fix common JSON formatting issues
      jsonStr = jsonStr
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Add quotes to property names
        .replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
          // Fix escaped content in string values
          return `: "${content
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t")}"`;
        });

      const changes = JSON.parse(jsonStr);
      return [message, changes];
    }
  } catch (error) {
    // Continue to final fallback
  }

  // Final fallback: Return a safe default
  console.warn("Could not parse AI response, using fallback", {
    response: response.substring(0, 200),
  });
  return [
    "I apologize, but there was an issue processing my response. Please try again.",
    { "!ADD_TO_END!": "" },
  ];
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

    console.log(
      `[CHAT] Streaming request started - Model: ${model}, Action: ${actionMode}, User: ${userId?.substring(
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

    // Create system prompt
    const systemPrompt =
      actionMode === "edit"
        ? `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested something of you.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand what the user has written so far and help the user improve, edit, expand, condense, rewrite, or otherwise 
        modify the content accordingly. 
        
        Your job is to return an array of EXACTLY two items in strict JSON format:
            1. A string of text responding to what the user said to you.
            2. a JSON object that contains the changes that should be made to the original text.

        CRITICAL: Your entire response must be a valid JSON array with exactly two elements.

        The JSON object must have the following properties:
        - each key is a snippet or section from the original text that you think should be replaced with new text
        - each value is the new text that should replace the original text
        - only include parts of the text that need to be changed, do not include any text that does not need to be changed
        - if you want to add text to the end of the original text, use the key "!ADD_TO_END!" and have the value as the text to add

        FORMATTING RULES:
        - Do NOT wrap your response in json blocks or any other formatting
        - Do NOT include any text before or after the JSON array
        - Ensure all strings in the JSON are properly escaped (use \\\\n for newlines, \\\\" for quotes)
        - Never use more than one key "!ADD_TO_END!" in the JSON object

        If the user has no text so far, use the key "!ADD_TO_END!" and have the value be the text that you think should be added 
        to the end of the text. Never put output text in the string of text, only in the JSON object.

        Do not ever mention the JSON object in your response to the user. Your response must be 
        written in natural, plain, human-like text — strictly avoid using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. Avoid artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
    `
        : `
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

    // Build UI-style messages with parts[], then convert to ModelMessages
    const uiMessages = [
      { role: "system" as const, parts: [{ type: "text", text: systemPrompt }] },
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

    // Select model and check usage
    // Default to Gemini to satisfy type checker; will be overridden below
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

    // Stream the response using Vercel AI SDK
    const result = await streamText({
      model: selectedModelProvider,
      messages,
      temperature: 0.7,
    });

    // Create streaming response
    let fullResponse = "";
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Helper function to send SSE data
        const sendEvent = (eventType: string, data: any) => {
          const sseData = `event: ${eventType}\ndata: ${JSON.stringify(
            data
          )}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        };

        try {
          // Send initial status
          sendEvent("status", { message: "Starting AI processing..." });

          let chunkCount = 0;

          // Stream the text
          for await (const delta of result.textStream) {
            fullResponse += delta;
            chunkCount++;

            sendEvent("chunk", {
              chunk: delta,
              progress: chunkCount,
              partial: fullResponse,
            });
          }

          // Send parsing status
          sendEvent("status", { message: "Processing response..." });

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

          // Handle different response formats based on action mode
          if (actionMode === "ask") {
            // For "ask" mode, return the response directly as text
            sendEvent("result", {
              result: fullResponse,
              history: updatedHistory,
              remainingUses,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "ask",
            });
          } else {
            // For "edit" mode, use robust parsing
            const [message, changes] = parseAIResponse(fullResponse);

            sendEvent("result", {
              result: [message, changes],
              history: updatedHistory,
              remainingUses,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "edit",
            });
          }

          // Send completion event
          sendEvent("complete", { message: "Processing complete" });
          console.log(
            `[CHAT] Streaming request completed successfully - Model: ${model}`
          );
        } catch (error) {
          console.error("[CHAT] Error in streaming:", error);
          sendEvent("error", {
            error: "Failed to generate content",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          controller.close();
        }
      },
    });

    // Return SSE response
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