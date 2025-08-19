import { NextRequest } from "next/server";
import { chatStream } from "@/scripts/write/chat-stream";
import { contextUpdate } from "@/scripts/write/context-update";

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
      `[STREAM] Streaming request started - Model: ${model}, Action: ${actionMode}, User: ${userId?.substring(
        0,
        8
      )}...`
    );

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

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

          let fullResponse = "";
          let chunkCount = 0;

          // Call the streaming chat function
          const { response, updatedHistory, remainingUses } = await chatStream(
            currentText,
            instructions,
            history,
            documentId,
            userId,
            model,
            actionMode,
            (chunk: string) => {
              // Stream each chunk to the client
              fullResponse += chunk;
              chunkCount++;

              sendEvent("chunk", {
                chunk,
                progress: chunkCount,
                partial: fullResponse,
              });
            }
          );

          // Send parsing status
          sendEvent("status", { message: "Processing response..." });

          // Update context before sending final result
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
              result: response,
              history: updatedHistory,
              remainingUses,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "ask",
            });
          } else {
            // For "edit" mode, use robust parsing
            const [message, changes] = parseAIResponse(response);

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
            `[STREAM] Streaming request completed successfully - Model: ${model}`
          );
        } catch (error) {
          console.error("[STREAM] Error in streaming chat:", error);
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
