import React, { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Calendar, User } from "lucide-react";
import { KanbanCard, Priority } from "./types";
import { getPriorityColor, isOverdue } from "./utils";
import { priorityIcons } from "./constants";

interface SortableCardProps {
  card: KanbanCard;
  onChange: (updates: Partial<KanbanCard>) => void;
  onRemove: () => void;
  activeId: string | null;
}

export function SortableCard({
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

  const isCardOverdue = isOverdue(card.dueDate);

  const PriorityIcon = priorityIcons[card.priority];

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
              <span
                className={`px-1 rounded-full text-[10px] bg-gray-100 dark:bg-neutral-700 ${
                  card.priority === "high"
                    ? "text-red-600 dark:text-red-400"
                    : card.priority === "medium"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {card.priority === "high"
                  ? "H"
                  : card.priority === "medium"
                  ? "M"
                  : "L"}
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
