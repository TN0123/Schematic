import type { CoreMessage } from "ai";
import type { ScheduleChatHistoryEntry } from "@/scripts/ai/chat/types";

export function buildCoreMessages(
  processedHistory: ScheduleChatHistoryEntry[],
  userPrompt: string,
): CoreMessage[] {
  const messages: CoreMessage[] = processedHistory.map((entry) => ({
    role: entry.role === "user" ? "user" : "assistant",
    content: [{ type: "text", text: entry.content }],
  }));

  messages.push({
    role: "user",
    content: [{ type: "text", text: userPrompt }],
  });

  return messages;
}
