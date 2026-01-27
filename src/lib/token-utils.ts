/**
 * Token estimation utilities for managing LLM context windows
 *
 * These are heuristic-based estimates, not exact counts.
 * For English text, ~4 characters per token is a reasonable approximation.
 */

// Gemini 2.5 Flash has a 1M token context window, but we use a conservative limit
const GEMINI_CONTEXT_WINDOW = 1_000_000;
const SAFE_THRESHOLD_PERCENTAGE = 0.8; // Trigger flush at 80% capacity
const SAFE_TOKEN_LIMIT = Math.floor(
  GEMINI_CONTEXT_WINDOW * SAFE_THRESHOLD_PERCENTAGE,
);

// More conservative limit for typical usage (avoid very long contexts)
const RECOMMENDED_TOKEN_LIMIT = 100_000; // 100k tokens for good performance

/**
 * Estimate the number of tokens in a string
 * Uses a simple heuristic: ~4 characters per token for English text
 * This tends to slightly overestimate, which is safer for context management
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Count characters, accounting for whitespace and special characters
  const charCount = text.length;

  // Heuristic: ~4 chars per token for English, ~2 for CJK
  // We use 3.5 as a compromise that slightly overestimates
  const estimatedTokens = Math.ceil(charCount / 3.5);

  return estimatedTokens;
}

/**
 * Estimate tokens for a chat message
 */
export function estimateMessageTokens(message: {
  role: string;
  content: string;
}): number {
  // Add overhead for message structure (role, formatting)
  const overhead = 10;
  return estimateTokens(message.content) + overhead;
}

/**
 * Estimate total tokens for a chat history
 */
export function estimateHistoryTokens(
  history: Array<{ role: string; content: string }>,
): number {
  return history.reduce((total, msg) => total + estimateMessageTokens(msg), 0);
}

/**
 * Check if the total context is approaching the token limit
 */
export function isApproachingLimit(
  systemPromptTokens: number,
  historyTokens: number,
  newMessageTokens: number,
  limit: number = RECOMMENDED_TOKEN_LIMIT,
): boolean {
  const totalTokens = systemPromptTokens + historyTokens + newMessageTokens;
  return totalTokens >= limit * SAFE_THRESHOLD_PERCENTAGE;
}

/**
 * Get context usage statistics
 */
export function getContextUsage(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  newMessage: string,
): {
  systemPromptTokens: number;
  historyTokens: number;
  newMessageTokens: number;
  totalTokens: number;
  percentageUsed: number;
  isNearLimit: boolean;
  recommendedAction: "none" | "summarize" | "truncate";
} {
  const systemPromptTokens = estimateTokens(systemPrompt);
  const historyTokens = estimateHistoryTokens(history);
  const newMessageTokens = estimateTokens(newMessage);
  const totalTokens = systemPromptTokens + historyTokens + newMessageTokens;

  const percentageUsed = (totalTokens / RECOMMENDED_TOKEN_LIMIT) * 100;

  let recommendedAction: "none" | "summarize" | "truncate" = "none";
  if (percentageUsed >= 90) {
    recommendedAction = "truncate";
  } else if (percentageUsed >= 70) {
    recommendedAction = "summarize";
  }

  return {
    systemPromptTokens,
    historyTokens,
    newMessageTokens,
    totalTokens,
    percentageUsed,
    isNearLimit: percentageUsed >= 70,
    recommendedAction,
  };
}

/**
 * Truncate history to fit within token limit
 * Keeps the most recent messages
 */
export function truncateHistory(
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
): Array<{ role: string; content: string }> {
  if (history.length === 0) return [];

  const result: Array<{ role: string; content: string }> = [];
  let totalTokens = 0;

  // Work backwards from most recent messages
  for (let i = history.length - 1; i >= 0; i--) {
    const messageTokens = estimateMessageTokens(history[i]);
    if (totalTokens + messageTokens > maxTokens) {
      break;
    }
    result.unshift(history[i]);
    totalTokens += messageTokens;
  }

  return result;
}

/**
 * Split history into parts for summarization
 * Returns the older part to summarize and the newer part to keep
 */
export function splitHistoryForSummarization(
  history: Array<{ role: string; content: string }>,
  keepRecentTokens: number = 20000,
): {
  toSummarize: Array<{ role: string; content: string }>;
  toKeep: Array<{ role: string; content: string }>;
} {
  if (history.length === 0) {
    return { toSummarize: [], toKeep: [] };
  }

  const toKeep: Array<{ role: string; content: string }> = [];
  let keptTokens = 0;

  // Work backwards to keep recent messages
  for (let i = history.length - 1; i >= 0; i--) {
    const messageTokens = estimateMessageTokens(history[i]);
    if (keptTokens + messageTokens > keepRecentTokens) {
      break;
    }
    toKeep.unshift(history[i]);
    keptTokens += messageTokens;
  }

  // Everything not kept should be summarized
  const toSummarize = history.slice(0, history.length - toKeep.length);

  return { toSummarize, toKeep };
}

export const TOKEN_LIMITS = {
  GEMINI_CONTEXT_WINDOW,
  SAFE_TOKEN_LIMIT,
  RECOMMENDED_TOKEN_LIMIT,
  SAFE_THRESHOLD_PERCENTAGE,
};
