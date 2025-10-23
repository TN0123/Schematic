export interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  userId: string;
}

export type ChangeMap = Record<string, string>;

export interface MobileChangeAPI {
  applyChange: (original: string, replacement: string) => void;
  rejectChange: (original: string) => void;
  appendChange: (newText: string) => void;
  acceptAllChanges: () => void;
  rejectAllChanges: () => void;
  setActiveHighlight: (text: string | null) => void;
}

export type ModelType = "basic" | "gpt-4.1" | "claude-sonnet-4-5";

export interface DiffRange {
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  changeKey: string; // The original text that's being replaced
}
