import type { ParsedAssistantResponse } from "@/scripts/ai/chat/types";

export function parseAssistantJsonResponse(responseText: string): ParsedAssistantResponse {
  if (!responseText || responseText.trim() === "") {
    return {
      response: "I apologize, but I couldn't process your request properly.",
    };
  }

  try {
    let cleanedResponseText = responseText
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    if (!cleanedResponseText.startsWith("{")) {
      const jsonMatch = cleanedResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponseText = jsonMatch[0];
      } else {
        console.warn("No JSON found in response, creating fallback");
        cleanedResponseText = JSON.stringify({
          response:
            cleanedResponseText ||
            "I apologize, but I encountered an error processing your request.",
          contextUpdate: null,
        });
      }
    }

    const parsed = JSON.parse(cleanedResponseText) as { response?: unknown };

    if (typeof parsed.response !== "string" || parsed.response.length === 0) {
      throw new Error(
        "Invalid response structure - missing or invalid 'response' field",
      );
    }

    return { response: parsed.response };
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Original response text:", responseText);
    return {
      response:
        "I apologize, but I encountered an error processing your request. Please try again.",
    };
  }
}
