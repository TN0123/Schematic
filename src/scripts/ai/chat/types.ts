import type { CoreMessage } from "ai";

export type ToolCallNote = { id: string; title: string; type?: string };

export type ToolCallUI = {
  name: string;
  description: string;
  notes?: ToolCallNote[];
};

export type ToolCallHandler = (toolCall: ToolCallUI) => void;

export type ScheduleChatHistoryEntry = {
  role: string;
  content: string;
};

export type ScheduleContext = {
  now: Date;
  userTimezone: string;
  userNow: Date;
  yesterdayInUserTz: Date;
  tomorrowInUserTz: Date;
  memoryContext: string;
  goalsContext: string;
  events: Array<{ title: string; start: Date; end: Date }>;
  assistantName: string;
};

export type ScheduleChatResult = {
  response: string;
  contextUpdated: boolean;
  toolCalls: ToolCallUI[];
};

export type ParsedAssistantResponse = {
  response: string;
};

export type BuiltPrompts = {
  systemPrompt: string;
  userPrompt: string;
};

export type PreCompactionResult = {
  processedHistory: ScheduleChatHistoryEntry[];
};

export type CoreMessagesResult = {
  messages: CoreMessage[];
};
