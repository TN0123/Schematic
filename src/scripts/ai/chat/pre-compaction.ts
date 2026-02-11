import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  getContextUsage,
  splitHistoryForSummarization,
  truncateHistory,
} from "@/lib/token-utils";
import { saveToMemory } from "@/lib/memory";
import type {
  PreCompactionResult,
  ScheduleChatHistoryEntry,
} from "@/scripts/ai/chat/types";

type MaybeHistoryEntry = {
  role: unknown;
  content: unknown;
};

function normalizeHistory(
  history: unknown[],
): ScheduleChatHistoryEntry[] {
  return history
    .map((entry) => {
      const e = entry as MaybeHistoryEntry;
      if (typeof e?.content !== "string") return null;
      const role = e?.role === "user" ? "user" : "assistant";
      return { role, content: e.content };
    })
    .filter((entry): entry is ScheduleChatHistoryEntry => entry !== null);
}

type ProcessHistoryParams = {
  history: unknown[];
  systemPrompt: string;
  userPrompt: string;
  userId?: string;
  timezone?: string;
};

export async function processHistoryForContextBudget({
  history,
  systemPrompt,
  userPrompt,
  userId,
  timezone,
}: ProcessHistoryParams): Promise<PreCompactionResult> {
  let processedHistory = normalizeHistory(history);
  let preCompactionSummary: string | null = null;

  if (!userId || !timezone) {
    return { processedHistory };
  }

  const contextUsage = getContextUsage(systemPrompt, processedHistory, userPrompt);

  if (
    contextUsage.recommendedAction === "summarize" ||
    contextUsage.recommendedAction === "truncate"
  ) {
    console.log(
      `Pre-compaction triggered: ${contextUsage.percentageUsed.toFixed(
        1,
      )}% context used`,
    );

    const { toSummarize, toKeep } = splitHistoryForSummarization(
      processedHistory,
      20000,
    );

    if (toSummarize.length > 0) {
      try {
        const extractionPrompt = `
You are analyzing a conversation to extract important information that should be remembered.

CONVERSATION TO ANALYZE:
${toSummarize.map((m) => `${m.role}: ${m.content}`).join("\n\n")}

Extract the following and return as JSON:
{
  "dailyFacts": ["facts specific to today's events or decisions"],
  "longtermFacts": ["durable facts about the user that should be remembered permanently"],
  "summary": "A brief 1-2 sentence summary of what was discussed"
}

Only include meaningful facts, not trivial conversation. Return valid JSON only.`;

        const extractionResult = await generateText({
          model: openai("gpt-5-nano"),
          prompt: extractionPrompt,
          temperature: 0,
        });

        try {
          const cleanedText = extractionResult.text
            .replace(/^```json\s*/, "")
            .replace(/\s*```$/, "")
            .trim();
          const extracted = JSON.parse(cleanedText) as {
            dailyFacts?: string[];
            longtermFacts?: string[];
            summary?: string;
          };

          if (extracted.dailyFacts && extracted.dailyFacts.length > 0) {
            const dailyContent = extracted.dailyFacts.join("\n• ");
            await saveToMemory(
              userId,
              `Pre-compaction summary:\n• ${dailyContent}`,
              "daily",
              timezone,
            );
          }

          if (extracted.longtermFacts && extracted.longtermFacts.length > 0) {
            const longtermContent = extracted.longtermFacts.join("\n• ");
            await saveToMemory(
              userId,
              `From conversation:\n• ${longtermContent}`,
              "longterm",
              timezone,
            );
          }

          preCompactionSummary = extracted.summary || null;
          console.log(
            `Pre-compaction: Saved ${
              extracted.dailyFacts?.length || 0
            } daily facts, ${
              extracted.longtermFacts?.length || 0
            } longterm facts`,
          );
        } catch (parseError) {
          console.error("Failed to parse extraction result:", parseError);
        }
      } catch (extractError) {
        console.error("Pre-compaction extraction failed:", extractError);
      }

      processedHistory = toKeep;

      if (preCompactionSummary && processedHistory.length > 0) {
        processedHistory = [
          {
            role: "user",
            content: `[Earlier conversation summary: ${preCompactionSummary}]`,
          },
          ...processedHistory,
        ];
      }
    }
  } else if (contextUsage.recommendedAction === "none") {
    processedHistory = truncateHistory(processedHistory, 50000);
    console.log(
      `Truncated history from ${history.length} to ${processedHistory.length} messages`,
    );
  }

  return { processedHistory };
}
