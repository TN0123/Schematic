export type Priority = "low" | "medium" | "high";
export type CardStatus = "todo" | "in-progress" | "done" | "blocked";

export interface KanbanCard {
  id: string;
  text: string;
  description?: string;
  columnId: string;
  priority: Priority;
  dueDate?: string;
  assignee?: string;
  tags: string[];
  createdAt: string;
  status: CardStatus;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  limit?: number;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  completionRate: number;
}

export type KanbanState = {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  filters: {
    search: string;
    priority: Priority | "all";
    assignee: string | "all";
    dueDate: "all" | "overdue" | "today" | "week";
  };
  showFilters: boolean;
  showOverview: boolean;
};

export type KanbanAction =
  | {
      type: "SET_STATE";
      payload: { columns?: KanbanColumn[]; cards?: KanbanCard[] };
    }
  | { type: "ADD_COLUMN"; payload: KanbanColumn }
  | {
      type: "UPDATE_COLUMN";
      payload: { id: string; updates: Partial<KanbanColumn> };
    }
  | { type: "REMOVE_COLUMN"; payload: { id: string } }
  | { type: "SET_COLUMNS"; payload: KanbanColumn[] }
  | { type: "ADD_CARD"; payload: KanbanCard }
  | {
      type: "UPDATE_CARD";
      payload: { id: string; updates: Partial<KanbanCard> };
    }
  | { type: "REMOVE_CARD"; payload: { id: string } }
  | { type: "SET_CARDS"; payload: KanbanCard[] }
  | { type: "UPDATE_FILTERS"; payload: Partial<KanbanState["filters"]> }
  | { type: "TOGGLE_FILTERS" }
  | { type: "TOGGLE_OVERVIEW" };

export interface BulletinKanbanProps {
  id: string;
  title: string;
  data: { columns: KanbanColumn[]; cards: KanbanCard[] };
  updatedAt?: Date;
  onSave: (
    id: string,
    updates: { title?: string; data?: any }
  ) => Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
}
