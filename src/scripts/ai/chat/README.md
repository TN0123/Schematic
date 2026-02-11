# Dashboard AI Chat Architecture

This folder contains the modular implementation behind the dashboard AI assistant flow (`scheduleChat`).

## Why this exists

The AI chat implementation grew into a large function that mixed:

- Context loading
- Prompt construction
- Tool definitions and side effects
- Context-window pre-compaction
- Model invocation and JSON parsing

Splitting those responsibilities makes the code easier to reason about, test, and safely extend.

## Module map

- `context.ts`
  - Loads user-specific context (assistant name, memory context, goals context, remaining events)
  - Calculates date helpers in user timezone (today/yesterday/tomorrow)
- `prompt.ts`
  - Builds the system prompt from loaded context
  - Keeps prompt wording centralized
- `tools.ts`
  - Defines all AI tools (`get_calendar_events`, `generate_calendar_events`, memory/profile tools, etc.)
  - Encapsulates tool-specific persistence and side effects
- `bulletin-search.ts`
  - Bulletin note search and searchable-text extraction helpers
- `pre-compaction.ts`
  - Context-window guardrail logic (summarize/truncate older history)
  - Stores distilled memory when summarization is triggered
- `messages.ts`
  - Converts normalized chat history into AI SDK `CoreMessage[]`
- `response.ts`
  - Parses and validates final model output JSON safely
- `schemas.ts`
  - Zod input schemas for tool arguments
- `types.ts`
  - Shared internal types for this module

## End-to-end flow

`../chat.ts` keeps the public API (`scheduleChat`) and orchestrates:

1. Load context via `loadScheduleContext`
2. Build prompt via `buildSchedulePrompts`
3. Process history via `processHistoryForContextBudget`
4. Build message payload via `buildCoreMessages`
5. Create tools via `createScheduleTools`
6. Call model with tool execution
7. Parse final JSON via `parseAssistantJsonResponse`
8. Return UI payload (`response`, `contextUpdated`, `toolCalls`)

## Extension guidelines

- Add new tools in `tools.ts` and define input validation in `schemas.ts`
- Keep prompt copy edits in `prompt.ts`
- Avoid adding DB access directly in `chat.ts`
- Keep `chat.ts` orchestration-only; push business logic into focused modules
- Update this README when adding major flow steps or modules
