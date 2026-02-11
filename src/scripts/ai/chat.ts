import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import { buildCoreMessages } from "@/scripts/ai/chat/messages";
import { loadScheduleContext } from "@/scripts/ai/chat/context";
import { buildSchedulePrompts } from "@/scripts/ai/chat/prompt";
import { processHistoryForContextBudget } from "@/scripts/ai/chat/pre-compaction";
import { parseAssistantJsonResponse } from "@/scripts/ai/chat/response";
import { createScheduleTools } from "@/scripts/ai/chat/tools";
import type { ToolCallHandler, ToolCallUI } from "@/scripts/ai/chat/types";

export async function scheduleChat(
  instructions: string,
  history: any[],
  userId?: string,
  timezone?: string,
  goalsView?: "list" | "text" | "todo",
  onToolCall?: ToolCallHandler,
) {
  const context = await loadScheduleContext({
    instructions,
    userId,
    timezone,
    goalsView,
  });

  const { systemPrompt, userPrompt } = buildSchedulePrompts({
    instructions,
    timezone,
    userId,
    context,
  });

  const toolCallsExecuted: ToolCallUI[] = [];
  const tools = createScheduleTools({
    userId,
    timezone,
    goalsView,
    toolCallsExecuted,
    onToolCall,
  });

  const { processedHistory } = await processHistoryForContextBudget({
    history,
    systemPrompt,
    userPrompt,
    userId,
    timezone,
  });

  const messages = buildCoreMessages(processedHistory, userPrompt);

  const result = await generateText({
    model: openai("gpt-5-nano"),
    system: systemPrompt,
    messages,
    tools,
    stopWhen: stepCountIs(10),
    temperature: 0,
  });

  const parsedResponse = parseAssistantJsonResponse(result.text);

  const memoryUpdated = toolCallsExecuted.some(
    (tc) => tc.name === "save_to_memory" || tc.name === "update_user_profile",
  );

  return {
    response: parsedResponse.response,
    contextUpdated: memoryUpdated,
    toolCalls: toolCallsExecuted,
  };
}
