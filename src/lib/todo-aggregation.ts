import prisma from "@/lib/prisma";
import { formatDueDate } from "@/app/bulletin/_components/utils/dateHelpers";

export interface AggregatedTodoItem {
  id: string;
  text: string;
  checked: boolean;
  dueDate?: string;
  dueTime?: string;
  noteTitle: string;
  noteId: string;
}

/**
 * Aggregates all todos from all todo-type bulletins for a user
 * Similar logic to AggregatedTodosView.tsx but for server-side use
 */
export async function aggregateAllTodos(
  userId: string,
  limit: number = 50
): Promise<AggregatedTodoItem[]> {
  // Fetch all todo bulletins
  const todoBulletins = await prisma.bulletin.findMany({
    where: {
      userId,
      type: "todo",
    },
    orderBy: { updatedAt: "desc" },
    select: { 
      id: true, 
      title: true, 
      data: true 
    },
  });

  const todos: AggregatedTodoItem[] = [];

  // Process each bulletin
  todoBulletins.forEach((bulletin) => {
    if (
      bulletin.data &&
      typeof bulletin.data === "object" &&
      "items" in bulletin.data &&
      Array.isArray((bulletin.data as any).items)
    ) {
      const items = (bulletin.data as any).items;
      
      items.forEach((todoItem: any) => {
        // Only process items that have the todo structure
        if (
          todoItem &&
          typeof todoItem.text === "string" &&
          typeof todoItem.checked === "boolean"
        ) {
          todos.push({
            id: todoItem.id,
            text: todoItem.text,
            checked: todoItem.checked,
            dueDate: todoItem.dueDate,
            dueTime: todoItem.dueTime,
            noteTitle: bulletin.title || "Untitled",
            noteId: bulletin.id,
          });
        }
      });
    }
  });

  // Sort by due date (similar to AggregatedTodosView)
  return todos
    .sort((a, b) => {
      // Items without due dates go to the end
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      
      // Sort by due date
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, limit); // Limit to reasonable number
}

/**
 * Formats aggregated todos for use in AI prompts
 */
export function formatTodosForPrompt(todos: AggregatedTodoItem[]): string {
  if (todos.length === 0) {
    return "User has no to-do lists created yet.";
  }

  // Group by checked status
  const uncheckedTodos = todos.filter(todo => !todo.checked);
  const checkedTodos = todos.filter(todo => todo.checked);

  let context = "User's To-Do Lists (Aggregated):\n";

  if (uncheckedTodos.length > 0) {
    context += `\nPending Tasks (${uncheckedTodos.length}):\n`;
    uncheckedTodos.forEach(todo => {
      let dueDateText = "";
      if (todo.dueDate) {
        if (todo.dueTime) {
          // Format date and time together
          const [hours, minutes] = todo.dueTime.split(':').map(Number);
          const date = new Date(todo.dueDate);
          date.setHours(hours, minutes, 0, 0);
          
          const dateStr = formatDueDate(todo.dueDate);
          const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
          
          dueDateText = ` (due: ${dateStr} at ${timeStr})`;
        } else {
          // Date only
          const dateStr = formatDueDate(todo.dueDate);
          dueDateText = ` (due: ${dateStr})`;
        }
      }
      context += `- [ ] ${todo.text}${dueDateText} [from: ${todo.noteTitle}]\n`;
    });
  }

  if (checkedTodos.length > 0) {
    context += `\nCompleted Tasks (${checkedTodos.length}):\n`;
    checkedTodos.forEach(todo => {
      let dueDateText = "";
      if (todo.dueDate) {
        if (todo.dueTime) {
          // Format date and time together
          const [hours, minutes] = todo.dueTime.split(':').map(Number);
          const date = new Date(todo.dueDate);
          date.setHours(hours, minutes, 0, 0);
          
          const dateStr = formatDueDate(todo.dueDate);
          const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
          
          dueDateText = ` (due: ${dateStr} at ${timeStr})`;
        } else {
          // Date only
          const dateStr = formatDueDate(todo.dueDate);
          dueDateText = ` (due: ${dateStr})`;
        }
      }
      context += `- [x] ${todo.text}${dueDateText} [from: ${todo.noteTitle}]\n`;
    });
  }

  return context;
}
