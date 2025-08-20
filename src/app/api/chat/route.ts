import { NextResponse } from "next/server";
import { chat } from "@/scripts/write/chat";
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

// Helper function to estimate if a query might be long-running
function isLikelyLongQuery(instructions: string, currentText: string): boolean {
  const instructionLength = instructions.length;
  const textLength = currentText.length;

  // Consider long if:
  // - Instructions are very detailed (>500 chars)
  // - Working with large text (>5000 chars)
  // - Contains keywords that suggest complex operations
  const complexKeywords = [
    "rewrite",
    "comprehensive",
    "detailed analysis",
    "complete",
    "thorough",
    "extensive",
    "full report",
    "deep dive",
    "elaborate",
  ];

  const hasComplexKeywords = complexKeywords.some((keyword) =>
    instructions.toLowerCase().includes(keyword)
  );

  return instructionLength > 500 || textLength > 5000 || hasComplexKeywords;
}

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
      forceSync = false, // New parameter to force synchronous processing
    } = await req.json();

    console.log(
      `[CHAT] Request received - Model: ${model}, Action: ${actionMode}, User: ${userId?.substring(
        0,
        8
      )}...`
    );

    // Check if this query should use streaming
    // Always use streaming for premium model (OpenAI) or for complex queries
    const shouldUseStreaming =
      !forceSync &&
      (model === "premium" || isLikelyLongQuery(instructions, currentText));

    if (shouldUseStreaming) {
      const reason = model === "premium" ? "premium model" : "complex query";
      console.log(
        `[CHAT] Redirecting to streaming endpoint - Reason: ${reason}`
      );

      const message =
        model === "premium"
          ? "Using streaming for premium model to ensure optimal performance."
          : "This query appears complex and may take longer than usual. Consider using the streaming endpoint for better performance.";

      return NextResponse.json(
        {
          suggestStreaming: true,
          message,
          streamEndpoint: "/api/chat/stream",
        },
        { status: 202 } // 202 Accepted but suggesting alternative
      );
    }

    console.log(`[CHAT] Processing synchronously - Model: ${model}`);

    // Add timeout protection (8 seconds to leave buffer for Vercel's 10s limit)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 8000);
    });

    const chatPromise = chat(
      currentText,
      instructions,
      history,
      documentId,
      userId,
      model,
      actionMode
    );

    let result: {
      response: string;
      updatedHistory: any[];
      remainingUses: number | null;
    };
    try {
      result = (await Promise.race([chatPromise, timeoutPromise])) as {
        response: string;
        updatedHistory: any[];
        remainingUses: number | null;
      };
    } catch (error) {
      if (error instanceof Error && error.message === "Request timeout") {
        console.log(
          `[CHAT] Request timed out - Redirecting to streaming endpoint`
        );
        return NextResponse.json(
          {
            timeout: true,
            message:
              "The request is taking longer than expected. Please use the streaming endpoint for complex queries.",
            streamEndpoint: "/api/chat/stream",
            suggestion:
              "Try using the streaming version of this endpoint for better handling of long-running requests.",
          },
          { status: 408 } // 408 Request Timeout
        );
      }
      throw error; // Re-throw other errors
    }

    const { response, updatedHistory, remainingUses } = result;

    const contextUpdateResult = await contextUpdate(updatedHistory, documentId);

    console.log(
      `[CHAT] Synchronous request completed successfully - Model: ${model}, Remaining uses: ${remainingUses}`
    );

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
      // For "edit" mode, use robust parsing
      const [message, changes] = parseAIResponse(response);

      return NextResponse.json(
        {
          result: [message, changes],
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
