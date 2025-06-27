import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, GripVertical, Pencil } from "lucide-react";
import { KanbanColumn, KanbanCard } from "./types";
import { SortableCard } from "./SortableCard";

interface SortableColumnProps {
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
}

function SortableColumnComponent({
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
}: SortableColumnProps) {
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
                      : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-dark-textDisabled"
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
              <SortableCard
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

export const SortableColumn = memo(SortableColumnComponent);
