"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
  memo,
} from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Save,
  Plus,
  X,
  Loader2,
  Trash2,
  GripVertical,
  Pencil,
  Columns,
  Search,
  Filter,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

type Priority = "low" | "medium" | "high";
type CardStatus = "todo" | "in-progress" | "done" | "blocked";

interface KanbanCard {
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

interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  limit?: number;
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  completionRate: number;
}

type KanbanState = {
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

type KanbanAction =
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

function kanbanReducer(state: KanbanState, action: KanbanAction): KanbanState {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "ADD_COLUMN":
      return { ...state, columns: [...state.columns, action.payload] };
    case "UPDATE_COLUMN":
      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id === action.payload.id
            ? { ...col, ...action.payload.updates }
            : col
        ),
      };
    case "REMOVE_COLUMN":
      return {
        ...state,
        columns: state.columns.filter((col) => col.id !== action.payload.id),
        cards: state.cards.filter(
          (card) => card.columnId !== action.payload.id
        ),
      };
    case "SET_COLUMNS":
      return { ...state, columns: action.payload };
    case "ADD_CARD":
      return { ...state, cards: [...state.cards, action.payload] };
    case "UPDATE_CARD":
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.payload.id
            ? { ...card, ...action.payload.updates }
            : card
        ),
      };
    case "REMOVE_CARD":
      return {
        ...state,
        cards: state.cards.filter((card) => card.id !== action.payload.id),
      };
    case "SET_CARDS":
      return { ...state, cards: action.payload };
    case "UPDATE_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case "TOGGLE_FILTERS":
      return { ...state, showFilters: !state.showFilters };
    case "TOGGLE_OVERVIEW":
      return { ...state, showOverview: !state.showOverview };
    default:
      return state;
  }
}

interface BulletinKanbanProps {
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

// Helper functions
const getPriorityColor = (priority: Priority) => {
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

const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

const calculateStats = (cards: KanbanCard[]): ProjectStats => {
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

const filterCards = (cards: KanbanCard[], filters: KanbanState["filters"]) => {
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

// Stats Panel Component
function StatsPanel({
  stats,
  isExpanded,
  onToggle,
}: {
  stats: ProjectStats;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg p-4 mb-6 border dark:border-dark-divider">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold dark:text-dark-textPrimary flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Overview
        </h3>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
          aria-label={isExpanded ? "Collapse overview" : "Expand overview"}
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Tasks
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completedTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.overdueTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Overdue
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.highPriorityTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              High Priority
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.completionRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completion
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Filters Panel Component
function FiltersPanel({
  filters,
  onUpdateFilters,
  availableAssignees,
}: {
  filters: KanbanState["filters"];
  onUpdateFilters: (updates: Partial<KanbanState["filters"]>) => void;
  availableAssignees: string[];
}) {
  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg p-4 mb-4 border dark:border-dark-divider">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
            />
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={(e) =>
              onUpdateFilters({ priority: e.target.value as Priority | "all" })
            }
            className="w-full px-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Assignee
          </label>
          <select
            value={filters.assignee}
            onChange={(e) => onUpdateFilters({ assignee: e.target.value })}
            className="w-full px-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
          >
            <option value="all">All Assignees</option>
            {availableAssignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date Filter */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Due Date
          </label>
          <select
            value={filters.dueDate}
            onChange={(e) =>
              onUpdateFilters({
                dueDate: e.target.value as "all" | "overdue" | "today" | "week",
              })
            }
            className="w-full px-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
          >
            <option value="all">All Dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
            <option value="week">Due This Week</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface SortableCardProps {
  card: KanbanCard;
  onChange: (updates: Partial<KanbanCard>) => void;
  onRemove: () => void;
  activeId: string | null;
}

function SortableCard({
  card,
  onChange,
  onRemove,
  activeId,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (activeId === card.id) {
      setIsEditing(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [activeId, card.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
  };

  const priorityIcon = {
    high: <AlertCircle className="w-3 h-3 text-red-500" />,
    medium: <Circle className="w-3 h-3 text-yellow-500" />,
    low: <CheckCircle2 className="w-3 h-3 text-green-500" />,
  };

  const isCardOverdue = isOverdue(card.dueDate);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-dark-secondary rounded-lg border dark:border-dark-divider shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing touch-manipulation
        ${isCardOverdue ? "border-l-4 border-l-red-500" : ""}
        ${isExpanded ? "min-h-32" : "min-h-16"}
      `}
    >
      <div className="p-3">
        {/* Card Header */}
        <div className="flex items-start gap-2 mb-2">
          {/* Grip Icon */}
          <div className="flex-shrink-0 mt-1" {...attributes} {...listeners}>
            <GripVertical className="w-3 h-3 text-gray-400 dark:text-dark-icon" />
          </div>

          {/* Card Content */}
          <div className="flex-grow min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={card.text}
                onChange={(e) => onChange({ text: e.target.value })}
                onBlur={() => setIsEditing(false)}
                onKeyDown={handleKeyDown}
                placeholder="Enter task title..."
                className="w-full bg-transparent border-b dark:border-dark-divider text-sm font-medium focus:outline-none dark:text-dark-textPrimary"
                autoFocus
              />
            ) : (
              <button
                className="w-full text-left text-sm font-medium dark:text-dark-textPrimary focus:outline-none"
                onClick={() => setIsEditing(true)}
              >
                {card.text || (
                  <span className="italic text-gray-400">Untitled Task</span>
                )}
              </button>
            )}
          </div>

          {/* Remove Button */}
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 flex-shrink-0"
            aria-label="Delete card"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Card Meta Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {/* Priority */}
            <div className="flex items-center gap-1">
              {priorityIcon[card.priority]}
              <span
                className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(
                  card.priority
                )}`}
              >
                {card.priority}
              </span>
            </div>

            {/* Assignee */}
            {card.assignee && (
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <User className="w-3 h-3" />
                <span>{card.assignee}</span>
              </div>
            )}
          </div>

          {/* Due Date */}
          {card.dueDate && (
            <div
              className={`flex items-center gap-1 ${
                isCardOverdue
                  ? "text-red-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{new Date(card.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {card.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t dark:border-dark-divider">
            <textarea
              value={card.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Add description..."
              className="w-full text-xs text-gray-600 dark:text-gray-400 bg-transparent resize-none focus:outline-none"
              rows={2}
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <select
                value={card.priority}
                onChange={(e) =>
                  onChange({ priority: e.target.value as Priority })
                }
                className="text-xs border dark:border-dark-divider rounded px-2 py-1 dark:bg-dark-background dark:text-dark-textPrimary"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>

              <input
                type="date"
                value={card.dueDate || ""}
                onChange={(e) => onChange({ dueDate: e.target.value })}
                className="text-xs border dark:border-dark-divider rounded px-2 py-1 dark:bg-dark-background dark:text-dark-textPrimary"
              />
            </div>

            <input
              type="text"
              value={card.assignee || ""}
              onChange={(e) => onChange({ assignee: e.target.value })}
              placeholder="Assignee"
              className="w-full text-xs border dark:border-dark-divider rounded px-2 py-1 mt-2 dark:bg-dark-background dark:text-dark-textPrimary"
            />
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-2"
        >
          {isExpanded ? "Less" : "More"}
        </button>
      </div>
    </li>
  );
}

const MemoizedSortableCard = memo(SortableCard);

function SortableColumn({
  column,
  cards,
  onAddCard,
  onRemoveCard,
  onUpdateCard,
  onRemoveColumn,
  onUpdateColumn,
  isEditing,
  onEditStart,
  onEditEnd,
  columnNameEdit,
  onColumnNameEditChange,
  activeId,
}: {
  column: KanbanColumn;
  cards: KanbanCard[];
  onAddCard: (columnId: string) => void;
  onRemoveCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, updates: Partial<KanbanCard>) => void;
  onRemoveColumn: (columnId: string) => void;
  onUpdateColumn: (columnId: string, updates: Partial<KanbanColumn>) => void;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  columnNameEdit: string;
  onColumnNameEditChange: (value: string) => void;
  activeId: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `column-${column.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardCount = cards.length;
  const isOverLimit = column.limit && cardCount > column.limit;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col h-full bg-gray-50 dark:bg-dark-secondary rounded-lg p-2 sm:p-4 overflow-y-scroll"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab flex-shrink-0"
          >
            <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 dark:text-dark-icon" />
          </div>

          {isEditing ? (
            <input
              type="text"
              value={columnNameEdit}
              onChange={(e) => onColumnNameEditChange(e.target.value)}
              onBlur={onEditEnd}
              className="font-semibold bg-transparent border-b dark:border-dark-divider px-2 py-1 text-xs sm:text-sm focus:outline-none dark:text-dark-textPrimary w-full"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-xs sm:text-sm dark:text-dark-textPrimary truncate">
                  {column.title}
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isOverLimit
                      ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {cardCount}
                  {column.limit ? `/${column.limit}` : ""}
                </span>
              </div>
              <button
                onClick={onEditStart}
                className="text-gray-500 hover:text-gray-700 dark:text-dark-icon dark:hover:text-dark-accent flex-shrink-0"
                type="button"
              >
                <Pencil className="w-2 h-2 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onRemoveColumn(column.id)}
          className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
          type="button"
        >
          <X className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Column Cards */}
      <div className="h-[calc(100vh-400px)] sm:h-full overflow-y-auto">
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2 sm:gap-3 px-1">
            {cards.map((card) => (
              <MemoizedSortableCard
                key={card.id}
                card={card}
                onChange={(updates) => onUpdateCard(card.id, updates)}
                onRemove={() => onRemoveCard(card.id)}
                activeId={activeId}
              />
            ))}
          </ul>
        </SortableContext>
      </div>

      {/* Add Card Button */}
      <button
        onClick={() => onAddCard(column.id)}
        className="mt-4 flex items-center justify-center gap-1 px-3 py-2 border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 text-sm rounded transition touch-manipulation"
        type="button"
        disabled={!!isOverLimit}
      >
        <Plus className="w-4 h-4" />
        Add Card
      </button>
    </div>
  );
}

const MemoizedSortableColumn = memo(SortableColumn);

export default function BulletinKanban({
  id,
  title: initialTitle,
  data,
  updatedAt,
  onSave,
  onDelete,
  isSaving: externalIsSaving = false,
}: BulletinKanbanProps) {
  const [title, setTitle] = useState(initialTitle);

  // Migrate old data format to new format
  const migrateCardData = (cards: any[]): KanbanCard[] => {
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

  const initialState: KanbanState = {
    columns: data?.columns || [
      { id: "todo", title: "To Do" },
      { id: "in-progress", title: "In Progress" },
      { id: "done", title: "Done" },
    ],
    cards: data?.cards ? migrateCardData(data.cards) : [],
    filters: {
      search: "",
      priority: "all",
      assignee: "all",
      dueDate: "all",
    },
    showFilters: false,
    showOverview: true,
  };

  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const { columns, cards, filters, showFilters, showOverview } = state;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [columnNameEdits, setColumnNameEdits] = useState<
    Record<string, string>
  >({});

  const lastSaved = useRef({
    title: initialTitle,
    columns: initialState.columns,
    cards: initialState.cards,
  });

  const sensors = useSensors(useSensor(PointerSensor));

  // Calculate project statistics
  const stats = calculateStats(cards);

  // Get available assignees for filter
  const availableAssignees = Array.from(
    new Set(
      cards
        .map((card) => card.assignee)
        .filter((assignee): assignee is string => Boolean(assignee))
    )
  );

  // Filter cards based on current filters
  const filteredCards = filterCards(cards, filters);

  useEffect(() => {
    const titleChanged = title !== lastSaved.current.title;
    const columnsChanged =
      JSON.stringify(columns) !== JSON.stringify(lastSaved.current.columns);
    const cardsChanged =
      JSON.stringify(cards) !== JSON.stringify(lastSaved.current.cards);
    setHasUnsavedChanges(titleChanged || columnsChanged || cardsChanged);
  }, [title, columns, cards]);

  // Debounced save for title
  const debouncedSaveTitle = useDebouncedCallback(async (newTitle: string) => {
    if (newTitle !== lastSaved.current.title) {
      setIsAutoSaving(true);
      try {
        await onSave(id, { title: newTitle });
        lastSaved.current.title = newTitle;

        // Update hasUnsavedChanges based on both title and data
        const columnsChanged =
          JSON.stringify(columns) !== JSON.stringify(lastSaved.current.columns);
        const cardsChanged =
          JSON.stringify(cards) !== JSON.stringify(lastSaved.current.cards);
        setHasUnsavedChanges(columnsChanged || cardsChanged);
      } catch (error) {
        console.error("Failed to auto-save title:", error);
      } finally {
        setIsAutoSaving(false);
      }
    }
  }, 800);

  // Debounced save for data (columns and cards)
  const debouncedSaveData = useDebouncedCallback(
    async (newColumns: KanbanColumn[], newCards: KanbanCard[]) => {
      const columnsChanged =
        JSON.stringify(newColumns) !==
        JSON.stringify(lastSaved.current.columns);
      const cardsChanged =
        JSON.stringify(newCards) !== JSON.stringify(lastSaved.current.cards);

      if (columnsChanged || cardsChanged) {
        setIsAutoSaving(true);
        try {
          await onSave(id, { data: { columns: newColumns, cards: newCards } });
          lastSaved.current.columns = newColumns;
          lastSaved.current.cards = newCards;

          // Update hasUnsavedChanges based on both title and data
          const titleChanged = title !== lastSaved.current.title;
          setHasUnsavedChanges(titleChanged);
        } catch (error) {
          console.error("Failed to auto-save data:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }
    },
    1000
  );

  useEffect(() => {
    debouncedSaveData(columns, cards);
  }, [columns, cards, debouncedSaveData]);

  const addCard = (columnId: string) => {
    const newCard: KanbanCard = {
      id: crypto.randomUUID(),
      text: "",
      description: "",
      columnId,
      priority: "medium",
      dueDate: "",
      assignee: "",
      tags: [],
      createdAt: new Date().toISOString(),
      status:
        columnId === "done"
          ? "done"
          : columnId === "in-progress"
          ? "in-progress"
          : "todo",
    };
    dispatch({ type: "ADD_CARD", payload: newCard });
    setActiveId(newCard.id);
  };

  const updateCard = (id: string, updates: Partial<KanbanCard>) => {
    dispatch({ type: "UPDATE_CARD", payload: { id, updates } });
  };

  const removeCard = (id: string) => {
    dispatch({ type: "REMOVE_CARD", payload: { id } });
  };

  const addColumn = () => {
    const newColumn = {
      id: crypto.randomUUID(),
      title: "New Column",
    };
    dispatch({ type: "ADD_COLUMN", payload: newColumn });
  };

  const updateColumn = (id: string, updates: Partial<KanbanColumn>) => {
    dispatch({ type: "UPDATE_COLUMN", payload: { id, updates } });
  };

  const removeColumn = (id: string) => {
    dispatch({ type: "REMOVE_COLUMN", payload: { id } });
  };

  const updateFilters = (updates: Partial<KanbanState["filters"]>) => {
    dispatch({ type: "UPDATE_FILTERS", payload: updates });
  };

  const toggleFilters = () => {
    dispatch({ type: "TOGGLE_FILTERS" });
  };

  const toggleOverview = () => {
    dispatch({ type: "TOGGLE_OVERVIEW" });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(id, { title, data: { columns, cards } });
      lastSaved.current = { title, columns, cards };
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Handle column reordering
    if (active.id.startsWith("column-") && over.id.startsWith("column-")) {
      const oldIndex = columns.findIndex((c) => `column-${c.id}` === active.id);
      const newIndex = columns.findIndex((c) => `column-${c.id}` === over.id);
      if (oldIndex !== newIndex) {
        dispatch({
          type: "SET_COLUMNS",
          payload: arrayMove(columns, oldIndex, newIndex),
        });
      }
      return;
    }

    // Handle card dragging. Active is a card.
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    if (oldIndex === -1) return;

    const activeCard = cards[oldIndex];
    let newIndex;
    let newColumnId: string;

    if (over.id.startsWith("column-")) {
      // Dropped on a column
      newColumnId = over.id.replace("column-", "");
      // If column is not the same, we'll move it. We want to place it at the end of the target column.
      const cardsInTargetColumn = cards.filter(
        (c) => c.id !== active.id && c.columnId === newColumnId
      );
      if (cardsInTargetColumn.length > 0) {
        // find index of last card in column
        const lastCard = cardsInTargetColumn[cardsInTargetColumn.length - 1];
        newIndex = cards.findIndex((c) => c.id === lastCard.id);
      } else {
        // dropping in an empty column.
        if (activeCard.columnId !== newColumnId) {
          const newStatus: CardStatus =
            newColumnId === "done"
              ? "done"
              : newColumnId === "in-progress"
              ? "in-progress"
              : "todo";
          const newCards = cards.map((c) =>
            c.id === active.id
              ? { ...c, columnId: newColumnId, status: newStatus }
              : c
          );
          dispatch({ type: "SET_CARDS", payload: newCards });
        }
        return;
      }
    } else {
      // Dropped on a card
      newIndex = cards.findIndex((c) => c.id === over.id);
      if (newIndex === -1) return;
      newColumnId = cards[newIndex].columnId;
    }

    if (activeCard.columnId === newColumnId) {
      if (oldIndex !== newIndex) {
        dispatch({
          type: "SET_CARDS",
          payload: arrayMove(cards, oldIndex, newIndex),
        });
      }
    } else {
      const newStatus: CardStatus =
        newColumnId === "done"
          ? "done"
          : newColumnId === "in-progress"
          ? "in-progress"
          : "todo";
      const newCards = cards.map((c) =>
        c.id === active.id
          ? { ...c, columnId: newColumnId, status: newStatus }
          : c
      );
      dispatch({
        type: "SET_CARDS",
        payload: arrayMove(newCards, oldIndex, newIndex),
      });
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && hasUnsavedChanges) {
        handleSave();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        handleSave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, handleSave]);

  return (
    <div className="w-full h-full dark:bg-dark-background transition-all">
      <div className="p-4 h-full flex flex-col">
        {/* Title & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 mb-4">
          <input
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 text-center dark:text-dark-textPrimary dark:bg-dark-background dark:focus:ring-dark-accent"
            value={title}
            onChange={(e) => {
              const newTitle = e.target.value;
              setTitle(newTitle);
              setHasUnsavedChanges(true);
              debouncedSaveTitle(newTitle);
            }}
            placeholder="Untitled Project Board"
            aria-label="Board title"
          />
          <div className="flex gap-2 ml-2">
            <button
              onClick={toggleFilters}
              className={`p-2 rounded-lg transition-all ${
                showFilters
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                  : "text-light-icon hover:text-light-accent hover:bg-light-hover dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover"
              }`}
              aria-label="Toggle filters"
              title="Filters"
              type="button"
            >
              <Filter className="h-5 w-5" />
            </button>
            <button
              onClick={addColumn}
              className="p-2 text-light-icon hover:text-light-accent hover:bg-light-hover dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover rounded-lg transition-all"
              aria-label="Add column"
              title="Add Column"
              type="button"
            >
              <Columns className="h-5 w-5" />
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving || externalIsSaving}
                className={`p-2 rounded-lg transition-colors
                  text-light-icon hover:text-light-accent hover:bg-light-hover
                  dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${
                    isSaving || externalIsSaving
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                aria-label="Save changes"
                type="button"
              >
                {isSaving || externalIsSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 text-light-icon hover:bg-red-300 dark:hover:bg-red-900 rounded-lg transition-all"
              aria-label="Delete board"
              type="button"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        <StatsPanel
          stats={stats}
          isExpanded={showOverview}
          onToggle={toggleOverview}
        />

        {/* Filters Panel */}
        {showFilters && (
          <FiltersPanel
            filters={filters}
            onUpdateFilters={updateFilters}
            availableAssignees={availableAssignees}
          />
        )}

        {/* Kanban Board */}
        <div className="relative border h-full rounded-lg p-3 flex flex-col dark:border-dark-divider overflow-y-auto">
          <div className="flex-1 overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
                <SortableContext
                  items={columns.map((col) => `column-${col.id}`)}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((column) => {
                    const columnCards = filteredCards.filter(
                      (card) => card.columnId === column.id
                    );
                    return (
                      <MemoizedSortableColumn
                        key={column.id}
                        column={column}
                        cards={columnCards}
                        onAddCard={addCard}
                        onRemoveCard={removeCard}
                        onUpdateCard={updateCard}
                        onRemoveColumn={removeColumn}
                        onUpdateColumn={updateColumn}
                        isEditing={editingColumn === column.id}
                        onEditStart={() => {
                          setEditingColumn(column.id);
                          setColumnNameEdits((prev) => ({
                            ...prev,
                            [column.id]: column.title,
                          }));
                        }}
                        onEditEnd={() => {
                          const newTitle = columnNameEdits[column.id]?.trim();
                          if (newTitle) {
                            updateColumn(column.id, { title: newTitle });
                          }
                          setEditingColumn(null);
                          setColumnNameEdits((prev) => {
                            const copy = { ...prev };
                            delete copy[column.id];
                            return copy;
                          });
                        }}
                        columnNameEdit={
                          columnNameEdits[column.id] ?? column.title
                        }
                        onColumnNameEditChange={(value) =>
                          setColumnNameEdits((prev) => ({
                            ...prev,
                            [column.id]: value,
                          }))
                        }
                        activeId={activeId}
                      />
                    );
                  })}
                </SortableContext>
              </div>

              <DragOverlay>
                {activeId ? (
                  activeId.startsWith("column-") ? (
                    <div className="bg-white dark:bg-dark-secondary rounded-lg p-4 shadow-lg">
                      {columns.find((col) => `column-${col.id}` === activeId)
                        ?.title || "Untitled"}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-dark-secondary rounded-lg p-4 shadow-lg">
                      {cards.find((card) => card.id === activeId)?.text ||
                        "Untitled"}
                    </div>
                  )
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
