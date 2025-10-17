export type ChangeMap = Record<string, string>;

// Undo stack types
export type UndoOperation =
  | {
      type: "text-edit";
      previousContent: string;
      newContent: string;
      cursorPosition: number;
    }
  | {
      type: "accept-suggestion";
      original: string;
      replacement: string;
      previousContent: string;
      newContent: string;
    }
  | {
      type: "accept-all-suggestions";
      previousContent: string;
      newContent: string;
      acceptedChanges: ChangeMap;
    }
  | {
      type: "append-suggestion";
      appendedText: string;
      previousContent: string;
      newContent: string;
    };

// Helper function to create text edit undo operation
export const createTextEditOperation = (
  previousContent: string,
  newContent: string,
  cursorPosition: number
): UndoOperation => ({
  type: "text-edit",
  previousContent,
  newContent,
  cursorPosition,
});

// Helper function to create accept suggestion undo operation
export const createAcceptSuggestionOperation = (
  original: string,
  replacement: string,
  previousContent: string,
  newContent: string
): UndoOperation => ({
  type: "accept-suggestion",
  original,
  replacement,
  previousContent,
  newContent,
});

// Helper function to create accept all suggestions undo operation
export const createAcceptAllSuggestionsOperation = (
  previousContent: string,
  newContent: string,
  acceptedChanges: ChangeMap
): UndoOperation => ({
  type: "accept-all-suggestions",
  previousContent,
  newContent,
  acceptedChanges,
});

// Helper function to create append suggestion undo operation
export const createAppendSuggestionOperation = (
  appendedText: string,
  previousContent: string,
  newContent: string
): UndoOperation => ({
  type: "append-suggestion",
  appendedText,
  previousContent,
  newContent,
});
