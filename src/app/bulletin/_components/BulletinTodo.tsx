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
  Clock,
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lastSaved = useRef({ title: initialTitle, items: data?.items || [] });

  // Debounced save for title
  const debouncedSaveTitle = useDebouncedCallback(async (newTitle: string) => {
    if (newTitle !== lastSaved.current.title) {
      setIsAutoSaving(true);
      try {
        await onSave(id, { title: newTitle });
        lastSaved.current.title = newTitle;

        // Update hasUnsavedChanges based on both title and items
        const titleChanged = newTitle !== lastSaved.current.title;
        const itemsChanged =
          JSON.stringify(items) !== JSON.stringify(lastSaved.current.items);
        setHasUnsavedChanges(titleChanged || itemsChanged);
      } catch (error) {
        console.error("Failed to auto-save title:", error);
      } finally {
        setIsAutoSaving(false);
      }
    }
  }, 800);

  // Debounced save for items
  const debouncedSaveItems = useDebouncedCallback(
    async (newItems: TodoItem[]) => {
      if (
        JSON.stringify(newItems) !== JSON.stringify(lastSaved.current.items)
      ) {
        setIsAutoSaving(true);
        try {
          await onSave(id, { data: { items: newItems } });
          lastSaved.current.items = newItems;

          // Update hasUnsavedChanges based on both title and items
          const titleChanged = title !== lastSaved.current.title;
          const itemsChanged =
            JSON.stringify(newItems) !==
            JSON.stringify(lastSaved.current.items);
          setHasUnsavedChanges(titleChanged || itemsChanged);
        } catch (error) {
          console.error("Failed to auto-save items:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }
    },
    1000
  );

  const addItem = () => {
    const newItems = [
      ...items,
      { id: crypto.randomUUID(), text: "", checked: false },
    ];
    setItems(newItems);
    setHasUnsavedChanges(true);
    debouncedSaveItems(newItems);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const updateItem = (id: string, updates: Partial<TodoItem>) => {
    let newItems: TodoItem[];
    if (updates.checked) {
      newItems = items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      setItems(newItems);

      setTimeout(() => {
        const filteredItems: TodoItem[] = newItems.filter(
          (item) => item.id !== id
        );
        setItems(filteredItems);
        debouncedSaveItems(filteredItems);
      }, 800);
    } else {
      newItems = items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      setItems(newItems);
      debouncedSaveItems(newItems);
    }
    setHasUnsavedChanges(true);
  };

  const removeItem = (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    setHasUnsavedChanges(true);
    debouncedSaveItems(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(id, { title, data: { items } });
    lastSaved.current = { title, items };
    setHasUnsavedChanges(false);
    setIsSaving(false);
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

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Enter" && index === items.length - 1) {
      addItem();
    }
  };

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
      <div className="p-4 h-full flex flex-col items-center">
        {/* Title & Actions */}
        <div className="flex justify-center items-center w-full md:w-1/2 mt-16 mb-4">
          <div className="flex-shrink-0">
            <ClipboardList className="h-8 w-8 text-green-500" />
          </div>
          <input
            className="font-semibold truncate tracking-tight text-2xl mb-1 w-full text-left focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 dark:text-dark-textPrimary dark:bg-dark-background dark:focus:ring-dark-accent"
            value={title}
            onChange={(e) => {
              const newTitle = e.target.value;
              setTitle(newTitle);
              setHasUnsavedChanges(true);
              debouncedSaveTitle(newTitle);
            }}
            placeholder="Untitled To Do List"
            aria-label="Todo list title"
          />
          <div className="flex gap-2 ml-2">
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving || externalIsSaving}
                className={`p-2 rounded-lg transition-colors
                  dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${
                    isSaving || externalIsSaving
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
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
              className="p-2 hover:bg-red-300 dark:hover:bg-red-900 rounded-lg transition-all"
              aria-label="Delete list"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Todo Items */}
        <div className="flex flex-col w-full md:w-1/2 border rounded-lg px-4 py-3 gap-3 dark:bg-dark-secondary dark:border-dark-divider">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 italic dark:text-dark-textSecondary">
              No tasks yet. Start by adding one below 👇
            </div>
          ) : (
            <ul
              className={`flex flex-col gap-3 ${
                items.length > 7 ? "overflow-y-scroll max-h-[60dvh]" : ""
              }`}
            >
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2 dark:border-dark-divider dark:hover:bg-dark-hover
                  ${item.checked ? "bg-green-50 dark:bg-green-900" : ""}
                  transition-all duration-200`}
                >
                  <button
                    onClick={() =>
                      updateItem(item.id, { checked: !item.checked })
                    }
                    aria-label={item.checked ? "Uncheck task" : "Check task"}
                    className="text-gray-500"
                  >
                    {item.checked ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    ref={index === items.length - 1 ? inputRef : null}
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      updateItem(item.id, { text: e.target.value })
                    }
                    onKeyDown={(e) => handleInputKeyDown(e, index)}
                    placeholder="Todo item..."
                    className={`flex-grow bg-transparent dark:border-dark-divider px-2 py-1 text-sm focus:outline-none dark:text-dark-textPrimary ${
                      item.checked
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : ""
                    }`}
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

          {/* Add Item Button */}
          <button
            onClick={addItem}
            className="self-end mt-2 flex items-center gap-1 px-3 py-1 border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 text-sm rounded-full transition"
            aria-label="Add new todo item"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
