import { NextRequest } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { PrismaClient } from "@prisma/client";
import { canUsePremiumModel, trackPremiumUsage } from "@/lib/subscription";

const prisma = new PrismaClient();

// Simple diff-based function to generate change map from original and improved text
function generateChangeMapFromDiff(
  originalText: string,
  improvedText: string
): Record<string, string> {
  // If texts are identical, no changes
  if (originalText === improvedText) {
    return {};
  }

  // Strategy: find common prefix and suffix, then create a single replacement
  let prefixEnd = 0;
  const minLength = Math.min(originalText.length, improvedText.length);

  // Find common prefix
  while (
    prefixEnd < minLength &&
    originalText[prefixEnd] === improvedText[prefixEnd]
  ) {
    prefixEnd++;
  }

  // Find common suffix
  let suffixStart = 0;
  while (
    suffixStart < minLength - prefixEnd &&
    originalText[originalText.length - 1 - suffixStart] ===
      improvedText[improvedText.length - 1 - suffixStart]
  ) {
    suffixStart++;
  }

  // Extract the changed portion
  const originalChanged = originalText.slice(
    prefixEnd,
    originalText.length - suffixStart
  );
  const improvedChanged = improvedText.slice(
    prefixEnd,
    improvedText.length - suffixStart
  );

  // If no change detected (shouldn't happen given earlier check), return empty
  if (originalChanged === improvedChanged) {
    return {};
  }

  // Create a replacement mapping
  return { [originalChanged]: improvedChanged };
}

export async function POST(req: NextRequest) {
  try {
    const {
      before,
      selected,
      after,
      userId,
      model = "gpt-4.1",
    } = await req.json();

    console.log(
      `[IMPROVE] Dual-stream request started - Model: ${model}, User: ${userId?.substring(
        0,
        8
      )}...`
    );

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
          console.log(`Using premium model - Remaining uses: ${remainingUses}`);
        } else {
          // Fall back to Gemini if limit reached
          selectedModelProvider = google("gemini-2.5-flash");
          console.log(`Premium model denied: ${usageCheck.reason}`);
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

    // Prompt for generating improved text
    const improvePrompt = `
      You are an AI writing assistant. Your task is to improve the quality of the following text for the user.
      You will be provided with text that the user wants to change as well as some surrounding context to help you 
      understand the text better. Only change the text that the user wants to change, do not change any other text.
      Do not change the meaning of the text, just improve it. If the text is a snippet of a larger text, 
      make it flow better with the rest of the text.

      CONTEXT BEFORE: 
      ${before}

      BEGINNING OF TEXT TO IMPROVE 
      ${selected}
      END OF TEXT TO IMPROVE
      
      CONTEXT AFTER:
      ${after}

      You must return ONLY the improved version of the text between "BEGINNING OF TEXT TO IMPROVE" and "END OF TEXT TO IMPROVE".
      Do not include the context before or after.
      Do not include any explanations, comments, or formatting.
      Return only the improved text.
    `;

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

          // Stream improved text
          const result = await streamText({
            model: selectedModelProvider,
            prompt: improvePrompt,
            temperature: 0.7,
          });

          let improvedText = "";

          // Stream text deltas
          for await (const delta of result.textStream) {
            improvedText += delta;
            sendEvent("assistant-delta", { delta });
          }

          sendEvent("assistant-complete", { text: improvedText });

          sendEvent("status", { message: "Generating changes..." });

          // Generate change map using diff
          const changeMap = generateChangeMapFromDiff(selected, improvedText);

          sendEvent("changes-final", { changes: changeMap });

          sendEvent("result", {
            result: changeMap,
            remainingUses,
          });

          sendEvent("complete", { message: "Processing complete" });
          console.log(`[IMPROVE] Dual-stream completed - Model: ${model}`);
        } catch (error) {
          console.error("[IMPROVE] Error in streaming:", error);
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
