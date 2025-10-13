import { format, isToday, isTomorrow, isYesterday, parseISO, differenceInDays } from "date-fns";
import { getUserTimezone } from "@/app/schedule/utils/calendarHelpers";

export type DueDateStatus = "overdue" | "today" | "soon" | "future" | null;

/**
 * Formats a due date string into a relative or absolute format
 * @param dueDate - ISO date string (YYYY-MM-DD)
 * @param timezone - User's timezone (optional, defaults to browser timezone)
 * @returns Formatted date string like "Today", "Tomorrow", "Oct 15"
 */
export function formatDueDate(dueDate: string, timezone?: string): string {
  if (!dueDate) return "";
  
  const tz = timezone || getUserTimezone();
  const date = parseISO(dueDate);
  
  // Get current date in user's timezone
  const now = new Date();
  const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  
  // Adjust the parsed date to the user's timezone for comparison
  const dateInTz = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  
  if (isToday(dateInTz)) {
    return "Today";
  }
  
  if (isTomorrow(dateInTz)) {
    return "Tomorrow";
  }
  
  if (isYesterday(dateInTz)) {
    return "Yesterday";
  }
  
  // For dates within the current year, show "Mon DD"
  const currentYear = nowInTz.getFullYear();
  const dateYear = dateInTz.getFullYear();
  
  if (currentYear === dateYear) {
    return format(dateInTz, "MMM d");
  }
  
  // For dates in different years, show "Mon DD, YYYY"
  return format(dateInTz, "MMM d, yyyy");
}

/**
 * Determines the status of a due date based on current date
 * @param dueDate - ISO date string (YYYY-MM-DD)
 * @param timezone - User's timezone (optional, defaults to browser timezone)
 * @returns Status: "overdue", "today", "soon" (within 3 days), "future", or null
 */
export function getDueDateStatus(dueDate: string | undefined, timezone?: string): DueDateStatus {
  if (!dueDate) return null;
  
  const tz = timezone || getUserTimezone();
  const date = parseISO(dueDate);
  
  // Get current date in user's timezone
  const now = new Date();
  const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  
  // Adjust the parsed date to the user's timezone for comparison
  const dateInTz = new Date(date.toLocaleString("en-US", { timeZone: tz }));
  
  // Set both dates to start of day for accurate comparison
  const startOfToday = new Date(nowInTz);
  startOfToday.setHours(0, 0, 0, 0);
  
  const startOfDueDate = new Date(dateInTz);
  startOfDueDate.setHours(0, 0, 0, 0);
  
  const daysDiff = differenceInDays(startOfDueDate, startOfToday);
  
  if (daysDiff < 0) {
    return "overdue";
  }
  
  if (daysDiff === 0) {
    return "today";
  }
  
  if (daysDiff <= 3) {
    return "soon";
  }
  
  return "future";
}

/**
 * Returns Tailwind color classes based on due date status
 * @param status - Due date status
 * @returns Object with text color classes for light and dark mode
 */
export function getDueDateColor(status: DueDateStatus): string {
  switch (status) {
    case "overdue":
      return "text-red-500 dark:text-red-400";
    case "today":
      return "text-orange-500 dark:text-orange-400";
    case "soon":
      return "text-yellow-600 dark:text-yellow-500";
    case "future":
      return "text-gray-500 dark:text-gray-400";
    default:
      return "text-gray-500 dark:text-gray-400";
  }
}

/**
 * Sorts todo items by due date (items with no date first, then by date ascending)
 * @param items - Array of todo items
 * @returns Sorted array of todo items
 */
export function sortTodoItemsByDueDate<T extends { dueDate?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return -1;
    if (!b.dueDate) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

