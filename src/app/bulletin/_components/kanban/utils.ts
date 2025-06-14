import { Priority, KanbanCard, ProjectStats, KanbanState } from "./types";

export const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
};

export const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

export const calculateStats = (cards: KanbanCard[]): ProjectStats => {
  const totalTasks = cards.length;
  const completedTasks = cards.filter((card) => card.status === "done").length;
  const overdueTasks = cards.filter((card) => isOverdue(card.dueDate)).length;
  const highPriorityTasks = cards.filter(
    (card) => card.priority === "high"
  ).length;
  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    highPriorityTasks,
    completionRate,
  };
};

export const filterCards = (
  cards: KanbanCard[],
  filters: KanbanState["filters"]
) => {
  return cards.filter((card) => {
    // Search filter
    if (
      filters.search &&
      !card.text.toLowerCase().includes(filters.search.toLowerCase()) &&
      !card.description?.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    // Priority filter
    if (filters.priority !== "all" && card.priority !== filters.priority) {
      return false;
    }

    // Assignee filter
    if (filters.assignee !== "all" && card.assignee !== filters.assignee) {
      return false;
    }

    // Due date filter
    if (filters.dueDate !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      switch (filters.dueDate) {
        case "overdue":
          if (!isOverdue(card.dueDate)) return false;
          break;
        case "today":
          if (
            !card.dueDate ||
            new Date(card.dueDate).toDateString() !== today.toDateString()
          )
            return false;
          break;
        case "week":
          if (!card.dueDate || new Date(card.dueDate) > weekFromNow)
            return false;
          break;
      }
    }

    return true;
  });
};

// Migrate old data format to new format
export const migrateCardData = (cards: any[]): KanbanCard[] => {
  return cards.map((card) => ({
    id: card.id,
    text: card.text || "",
    description: card.description || "",
    columnId: card.columnId,
    priority: card.priority || "medium",
    dueDate: card.dueDate || "",
    assignee: card.assignee || "",
    tags: card.tags || [],
    createdAt: card.createdAt || new Date().toISOString(),
    status:
      card.status ||
      (card.columnId === "done"
        ? "done"
        : card.columnId === "in-progress"
        ? "in-progress"
        : "todo"),
  }));
};
