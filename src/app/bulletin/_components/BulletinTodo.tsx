"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { isPrimaryModifierPressed } from "@/components/utils/platform";
import {
  Plus,
  X,
  Save,
  CheckCircle,
  Circle,
  Loader2,
  Trash2,
  ClipboardList,
  GripVertical,
  Clock,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { formatDistanceToNow } from "date-fns";
import DatePickerModal from "./DatePickerModal";
import TodoItemMenu from "./TodoItemMenu";
import {
  formatDueDate,
  getDueDateStatus,
  getDueDateColor,
  sortTodoItemsByDueDate,
} from "./utils/dateHelpers";

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  dueDate?: string; // ISO date string (YYYY-MM-DD)
}

interface BulletinTodoProps {
  id: string;
  title: string;
  data: { items: TodoItem[] };
  updatedAt: Date;
  onSave: (
    id: string,
    updates: { title?: string; data?: any }
  ) => Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
}

export default function BulletinTodo({
  id,
  title: initialTitle,
  data,
  updatedAt,
  onSave,
  onDelete,
  isSaving: externalIsSaving = false,
}: BulletinTodoProps) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<TodoItem[]>(data?.items || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerItemId, setDatePickerItemId] = useState<string | null>(null);

  const lastSaved = useRef({ title: initialTitle, items: data?.items || [] });
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});

  const hasUnsavedChanges =
    title !== lastSaved.current.title ||
    JSON.stringify(items) !== JSON.stringify(lastSaved.current.items);

  const debouncedSave = useDebouncedCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsAutoSaving(true);
    try {
      await onSave(id, { title, data: { items } });
      lastSaved.current = { title, items };
    } catch (error) {
      console.error("Failed to auto-save:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, 1000);

  useEffect(() => {
    debouncedSave();
  }, [title, items, debouncedSave]);

  // Auto-resize textarea
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(24, textarea.scrollHeight) + "px";
  };

  const addItem = (inheritDueDate?: string) => {
    const newItemId = crypto.randomUUID();
    const newItems = [
      ...items,
      { id: newItemId, text: "", checked: false, dueDate: inheritDueDate },
    ];
    setItems(newItems);
    setTimeout(() => {
      const textarea = textareaRefs.current[newItemId];
      if (textarea) {
        textarea.focus();
        adjustTextareaHeight(textarea);
      }
    }, 0);
  };

  const updateItem = (id: string, updates: Partial<TodoItem>) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setItems(newItems);
  };

  const removeItem = (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(id, { title, data: { items } });
    lastSaved.current = { title, items };
    setIsSaving(false);
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (isPrimaryModifierPressed(event) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (hasUnsavedChanges) {
          handleSave();
        }
      }
    },
    [hasUnsavedChanges, handleSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    itemId: string,
    itemIndex: number
  ) => {
    const textarea = e.currentTarget;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const currentItem = items.find((item) => item.id === itemId);
      addItem(currentItem?.dueDate);
    } else if (
      e.key === "Backspace" &&
      textarea.value === "" &&
      items.length > 1
    ) {
      e.preventDefault();
      removeItem(itemId);
      // Focus previous item if available
      const prevIndex = itemIndex - 1;
      if (prevIndex >= 0) {
        setTimeout(() => {
          const prevId = items[prevIndex]?.id;
          if (prevId && textareaRefs.current[prevId]) {
            const prevTextarea = textareaRefs.current[prevId];
            prevTextarea.focus();
            prevTextarea.setSelectionRange(
              prevTextarea.value.length,
              prevTextarea.value.length
            );
          }
        }, 0);
      }
    } else if (e.key === "ArrowUp" && itemIndex > 0) {
      e.preventDefault();
      const prevId = items[itemIndex - 1]?.id;
      if (prevId && textareaRefs.current[prevId]) {
        textareaRefs.current[prevId].focus();
      }
    } else if (e.key === "ArrowDown" && itemIndex < items.length - 1) {
      e.preventDefault();
      const nextId = items[itemIndex + 1]?.id;
      if (nextId && textareaRefs.current[nextId]) {
        textareaRefs.current[nextId].focus();
      }
    }
  };

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    itemId: string
  ) => {
    adjustTextareaHeight(e.target);
    updateItem(itemId, { text: e.target.value });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = items.findIndex((item) => item.id === draggedItem);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [draggedItemData] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItemData);

    setItems(newItems);
    setDraggedItem(null);
  };

  const handleSetDueDate = (itemId: string) => {
    setDatePickerItemId(itemId);
    setDatePickerOpen(true);
  };

  const handleSetDueToday = (itemId: string) => {
    const today = new Date().toISOString().split("T")[0];
    updateItem(itemId, { dueDate: today });
  };

  const handleSetDueTomorrow = (itemId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split("T")[0];
    updateItem(itemId, { dueDate: tomorrowString });
  };

  const handleSaveDueDate = (date: string | null) => {
    if (datePickerItemId) {
      updateItem(datePickerItemId, { dueDate: date || undefined });
    }
    setDatePickerOpen(false);
    setDatePickerItemId(null);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && hasUnsavedChanges) {
        handleSave();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasUnsavedChanges, handleSave]);

  const uncheckedItems = sortTodoItemsByDueDate(
    items.filter((item) => !item.checked)
  );
  const checkedItems = items.filter((item) => item.checked);

  // Group unchecked items by due date for display
  const groupedItems = uncheckedItems.reduce((groups, item) => {
    const key = item.dueDate || "no-date";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, TodoItem[]>);

  // Get ordered date keys
  const dateKeys = Object.keys(groupedItems).sort((a, b) => {
    if (a === "no-date") return -1;
    if (b === "no-date") return 1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Check if any items have dates
  const hasItemsWithDates = items.some((item) => item.dueDate);

  // Calculate today's progress (only for items due today)
  const today = new Date().toISOString().split("T")[0];
  const todayItems = items.filter((item) => item.dueDate === today);
  const todayCheckedItems = todayItems.filter((item) => item.checked);

  return (
    <div className="w-full h-full dark:bg-dark-background transition-colors">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 gap-4 flex-shrink-0">
          <div className="flex items-center gap-4 flex-grow">
            <ClipboardList className="h-10 w-10 text-green-500 flex-shrink-0" />
            <div className="flex flex-col w-full">
              <input
                className="font-semibold tracking-tight text-3xl bg-transparent focus:outline-none w-full dark:text-dark-textPrimary placeholder-gray-400 dark:placeholder-gray-500 border-none resize-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled"
                aria-label="Todo list title"
              />
              <div className="text-s text-gray-400 dark:text-gray-500 mt-1">
                {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 flex-shrink-0">
            {isAutoSaving && (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            )}
            {hasUnsavedChanges && !isAutoSaving && (
              <button
                onClick={handleSave}
                disabled={isSaving || externalIsSaving}
                className="p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-dark-accent dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Save changes"
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
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 dark:text-dark-textPrimary dark:hover:bg-red-900/50 dark:hover:text-red-500 rounded-lg transition-all"
              aria-label="Delete list"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        {items.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
              <span>
                {hasItemsWithDates && todayItems.length > 0
                  ? "Today's progress"
                  : "Progress"}
              </span>
              <span>
                {hasItemsWithDates && todayItems.length > 0
                  ? `${todayCheckedItems.length}/${todayItems.length} completed`
                  : `${checkedItems.length}/${items.length} completed`}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-dark-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${
                    hasItemsWithDates && todayItems.length > 0
                      ? todayItems.length > 0
                        ? (todayCheckedItems.length / todayItems.length) * 100
                        : 0
                      : items.length > 0
                      ? (checkedItems.length / items.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Todo Items Container (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col space-y-1">
          {items.length === 0 && (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center space-y-3 max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-dark-secondary flex items-center justify-center">
                  <ClipboardList className="h-8 w-8 text-gray-400 dark:text-dark-textSecondary" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-dark-textSecondary font-medium">
                    No tasks yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-dark-textSecondary mt-1">
                    Click the button below to add your first task
                  </p>
                </div>
                <button
                  onClick={() => addItem()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add your first task
                </button>
              </div>
            </div>
          )}

          {/* Add Item Button */}
          {items.length > 0 && (
            <button
              onClick={() => addItem()}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-dark-hover dark:hover:text-gray-300 transition-all duration-150 group mb-4"
              aria-label="Add new todo item"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" /> {/* Spacer for grip icon */}
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-base">Add a task</span>
            </button>
          )}

          {/* Unchecked Items - Grouped by Date */}
          {uncheckedItems.length > 0 && (
            <div className="space-y-4">
              {dateKeys.map((dateKey) => {
                const itemsInGroup = groupedItems[dateKey];

                return (
                  <div key={dateKey}>
                    {/* Date Header */}
                    <div className="flex items-center justify-center mb-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-textSecondary">
                        {dateKey === "no-date"
                          ? "No Date"
                          : formatDueDate(dateKey)}
                      </div>
                    </div>

                    {/* Items in this date group */}
                    <div className="space-y-1">
                      {itemsInGroup.map((item) => {
                        const itemIndex = uncheckedItems.findIndex(
                          (i) => i.id === item.id
                        );
                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, item.id)}
                            className={`group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-150 ${
                              draggedItem === item.id ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 pt-1">
                              <GripVertical className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity" />
                              <button
                                onClick={() =>
                                  updateItem(item.id, { checked: true })
                                }
                                aria-label="Check task"
                                className="relative"
                              >
                                <Circle className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
                                <div className="absolute inset-0 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" />
                              </button>
                            </div>
                            <div className="flex-grow">
                              <textarea
                                ref={(el) => {
                                  if (el) textareaRefs.current[item.id] = el;
                                }}
                                rows={1}
                                value={item.text}
                                onChange={(e) =>
                                  handleTextareaChange(e, item.id)
                                }
                                onKeyDown={(e) =>
                                  handleTextareaKeyDown(e, item.id, itemIndex)
                                }
                                placeholder="Write a task..."
                                className="w-full bg-transparent focus:outline-none dark:text-dark-textPrimary placeholder-gray-400 dark:placeholder-gray-500 resize-none border-none text-base leading-6 pt-0.5"
                                aria-label="Todo item text"
                                style={{ minHeight: "24px" }}
                              />
                            </div>
                            <TodoItemMenu
                              onSetDueDate={() => handleSetDueDate(item.id)}
                              onSetDueToday={() => handleSetDueToday(item.id)}
                              onSetDueTomorrow={() =>
                                handleSetDueTomorrow(item.id)
                              }
                            />
                            <button
                              onClick={() => removeItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-hover dark:hover:text-gray-300 mt-0.5"
                              aria-label="Delete item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Items */}
          {checkedItems.length > 0 && (
            <div className="mt-8 space-y-1">
              <div className="flex items-center gap-3 py-3">
                <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
                <span className="text-sm font-medium text-gray-500 dark:text-dark-textSecondary bg-gray-50 dark:bg-dark-secondary px-3 py-1 rounded-full">
                  Completed • {checkedItems.length}
                </span>
                <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
              </div>
              {checkedItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 rounded-lg px-3 py-2 opacity-60 hover:opacity-80 transition-all duration-150"
                >
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-4 h-4" /> {/* Spacer for grip icon */}
                    <button
                      onClick={() => updateItem(item.id, { checked: false })}
                      aria-label="Uncheck task"
                      className="relative"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div className="absolute inset-0 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" />
                    </button>
                  </div>
                  <div className="flex-grow">
                    <textarea
                      ref={(el) => {
                        if (el) textareaRefs.current[item.id] = el;
                      }}
                      rows={1}
                      value={item.text}
                      onChange={(e) => handleTextareaChange(e, item.id)}
                      className="w-full bg-transparent focus:outline-none line-through text-gray-500 dark:text-gray-400 resize-none border-none text-base leading-6 pt-0.5"
                      aria-label="Completed todo item text"
                      style={{ minHeight: "24px" }}
                    />
                    {item.dueDate && (
                      <div className="flex items-center gap-1 text-xs mt-1 text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Due: {formatDueDate(item.dueDate)}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-hover dark:hover:text-gray-300 mt-0.5"
                    aria-label="Delete item"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSave={handleSaveDueDate}
        currentDate={
          datePickerItemId
            ? items.find((item) => item.id === datePickerItemId)?.dueDate
            : undefined
        }
      />
    </div>
  );
}
