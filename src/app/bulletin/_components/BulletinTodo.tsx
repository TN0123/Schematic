"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  X,
  Save,
  CheckCircle,
  Circle,
  Loader2,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
}

interface BulletinTodoProps {
  id: string;
  title: string;
  data: { items: TodoItem[] };
  updatedAt?: Date;
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

  const lastSaved = useRef({ title: initialTitle, items: data?.items || [] });

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

  const addItem = () => {
    const newItemId = crypto.randomUUID();
    const newItems = [...items, { id: newItemId, text: "", checked: false }];
    setItems(newItems);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        `input[data-item-id="${newItemId}"]`
      );
      input?.focus();
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
      if (event.ctrlKey && event.key === "s") {
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

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    isLastUnchecked: boolean
  ) => {
    if (e.key === "Enter" && isLastUnchecked) {
      addItem();
    }
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

  const uncheckedItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

  return (
    <div className="w-full h-full dark:bg-dark-background transition-colors">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 gap-4">
          <div className="flex items-center gap-3 flex-grow">
            <ClipboardList className="h-8 w-8 text-green-500 flex-shrink-0" />
            <input
              className="font-semibold tracking-tight text-2xl bg-transparent focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 w-full dark:text-dark-textPrimary dark:focus:ring-dark-accent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled To Do List"
              aria-label="Todo list title"
            />
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

        {/* Todo Items */}
        <div className="flex-grow flex flex-col bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-xl shadow-sm overflow-hidden">
          <div className="flex-grow p-4 space-y-2 overflow-y-auto">
            {items.length === 0 && (
              <div className="text-center text-gray-500 py-10 italic dark:text-dark-textSecondary">
                No tasks yet. Start by adding one below 👇
              </div>
            )}

            {/* Unchecked Items */}
            {uncheckedItems.length > 0 && (
              <ul className="space-y-2">
                {uncheckedItems.map((item, index) => (
                  <li
                    key={item.id}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                  >
                    <button
                      onClick={() => updateItem(item.id, { checked: true })}
                      aria-label="Check task"
                      className="p-1"
                    >
                      <Circle className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                    </button>
                    <input
                      data-item-id={item.id}
                      type="text"
                      value={item.text}
                      onChange={(e) =>
                        updateItem(item.id, { text: e.target.value })
                      }
                      onKeyDown={(e) =>
                        handleInputKeyDown(
                          e,
                          index === uncheckedItems.length - 1
                        )
                      }
                      placeholder="To-do item..."
                      className="flex-grow bg-transparent focus:outline-none dark:text-dark-textPrimary"
                      aria-label="Todo item text"
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-gray-500 transition-opacity hover:bg-gray-200 dark:hover:bg-dark-hover"
                      aria-label="Delete item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Checked Items */}
            {checkedItems.length > 0 && (
              <>
                <div className="flex items-center gap-3 py-2">
                  <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
                  <span className="text-xs font-medium text-gray-400 dark:text-dark-textSecondary">
                    Completed ({checkedItems.length})
                  </span>
                  <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
                </div>
                <ul className="space-y-2">
                  {checkedItems.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2"
                    >
                      <button
                        onClick={() => updateItem(item.id, { checked: false })}
                        aria-label="Uncheck task"
                        className="p-1"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </button>
                      <input
                        data-item-id={item.id}
                        type="text"
                        value={item.text}
                        onChange={(e) =>
                          updateItem(item.id, { text: e.target.value })
                        }
                        className="flex-grow bg-transparent focus:outline-none line-through text-gray-400 dark:text-gray-500"
                        aria-label="Todo item text"
                      />
                      <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-gray-500 transition-opacity hover:bg-gray-200 dark:hover:bg-dark-hover"
                        aria-label="Delete item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Add Item Button */}
          <div className="border-t border-gray-200 dark:border-dark-divider p-2">
            <button
              onClick={addItem}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
              aria-label="Add new todo item"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
