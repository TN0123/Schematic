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
