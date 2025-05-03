"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Save, CheckCircle, Circle } from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
}

interface BulletinTodoProps {
  id: string;
  title: string;
  data: { items: TodoItem[] };
  onSave: (
    id: string,
    updates: { title?: string; data?: any }
  ) => Promise<void>;
  onDelete?: () => void;
}

export default function BulletinTodo({
  id,
  title: initialTitle,
  data,
  onSave,
  onDelete,
}: BulletinTodoProps) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<TodoItem[]>(data?.items || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const lastSaved = useRef({ title: initialTitle, items: data?.items || [] });

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), text: "", checked: false }]);
    setHasUnsavedChanges(true);
  };

  const updateItem = (id: string, updates: Partial<TodoItem>) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setHasUnsavedChanges(true);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setHasUnsavedChanges(true);
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

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-dark-background rounded-lg shadow-md">
      <div className="flex justify-between items-center">
        <input
          className="text-xl font-semibold w-full px-2 py-1 rounded dark:bg-dark-background dark:text-dark-textPrimary"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setHasUnsavedChanges(true);
          }}
          placeholder="Untitled Todo List"
        />
        <div className="flex gap-2 ml-2">
          {hasUnsavedChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 rounded text-light-icon dark:text-dark-icon hover:bg-light-hover dark:hover:bg-dark-hover"
            >
              <Save className="w-5 h-5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded text-red-500 hover:bg-red-200 dark:hover:bg-red-900"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <button
              onClick={() => updateItem(item.id, { checked: !item.checked })}
              className="text-gray-500 dark:text-dark-icon"
            >
              {item.checked ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            <input
              type="text"
              className="flex-grow border-b px-1 py-0.5 text-sm dark:bg-transparent dark:text-dark-textPrimary focus:outline-none"
              value={item.text}
              onChange={(e) => updateItem(item.id, { text: e.target.value })}
              placeholder="Todo item..."
            />
            <button
              onClick={() => removeItem(item.id)}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="pt-2 flex gap-2">
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-green-500 hover:bg-green-600 rounded-md shadow"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>
    </div>
  );
}
