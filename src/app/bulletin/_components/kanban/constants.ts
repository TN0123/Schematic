import { AlertCircle, Circle, CheckCircle2 } from "lucide-react";
import { Priority } from "./types";

export const priorityIcons = {
  high: AlertCircle,
  medium: Circle,
  low: CheckCircle2,
} as const;

export const DEFAULT_COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export const DUE_DATE_OPTIONS = [
  { value: "all", label: "All Dates" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due Today" },
  { value: "week", label: "Due This Week" },
] as const;
