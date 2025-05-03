"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
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
} from "lucide-react";

interface QueueItem {
  id: string;
  text: string;
}

interface BulletinPriorityQueueProps {
  id: string;
  title: string;
  data: { items: QueueItem[] };
  onSave: (
    id: string,
    updates: { title?: string; data?: any }
  ) => Promise<void>;
  onDelete?: () => void;
}

function SortableQueueItem({
  item,
  onChange,
  onRemove,
}: {
  item: QueueItem;
  onChange: (text: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md px-3 py-4 border dark:border-dark-divider bg-white dark:bg-dark-secondary"
    >
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4 text-gray-400 dark:text-dark-icon" />
      </div>

      {/* Item Content: Edit/View Toggle */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={item.text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleKeyDown}
          placeholder="Enter item text..."
          className="flex-grow bg-transparent border-b dark:border-dark-divider px-2 py-1 text-center text-sm focus:outline-none dark:text-dark-textPrimary"
          aria-label="Edit queue item"
        />
      ) : (
        <button
          className="flex-grow text-left text-sm text-black text-center dark:text-dark-textPrimary truncate focus:outline-none"
          onClick={() => setIsEditing(true)}
          aria-label="Edit queue item"
        >
          {item.text || <span className="italic text-gray-400">Untitled</span>}
        </button>
      )}

      {/* Edit Icon */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="text-gray-500 hover:text-gray-700 dark:text-dark-icon dark:hover:text-dark-accent"
          aria-label="Edit item"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onRemove}
        className="text-red-400 hover:text-red-600"
        aria-label="Delete item"
      >
        <X className="w-4 h-4" />
      </button>
    </li>
  );
}

export default function BulletinPriorityQueue({
  id,
  title: initialTitle,
  data,
  onSave,
  onDelete,
}: BulletinPriorityQueueProps) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState<QueueItem[]>(data?.items || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lastSaved = useRef({ title: initialTitle, items: data?.items || [] });

  const sensors = useSensors(useSensor(PointerSensor));

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), text: "" }]);
    setHasUnsavedChanges(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const updateItem = (id: string, updates: Partial<QueueItem>) => {
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
      setHasUnsavedChanges(true);
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

  return (
    <div className="border w-full h-full dark:bg-dark-background dark:border-dark-divider transition-all">
      <div className="p-4 h-full flex flex-col items-center">
        {/* Title & Actions */}
        <div className="flex justify-between items-center w-full">
          <input
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 mb-2 text-center dark:text-dark-textPrimary dark:focus:ring-dark-accent"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="Untitled Priority Queue"
            aria-label="Queue title"
          />
          <div className="flex gap-2 ml-2">
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`p-2 rounded-lg transition-colors
                  text-light-icon hover:text-light-accent hover:bg-light-hover
                  dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label="Save changes"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 text-light-icon hover:bg-red-300 dark:hover:bg-red-900 rounded-lg transition-all"
              aria-label="Delete list"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Queue Items */}
        <div className="flex flex-col w-full md:w-1/2 border rounded-lg px-4 py-3 gap-3 dark:border-dark-divider">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 italic dark:text-dark-textSecondary">
              Queue is empty. Start by adding items 👇
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul
                  className={`flex flex-col gap-3 ${
                    items.length > 7 ? "overflow-y-scroll max-h-[60dvh]" : ""
                  }`}
                >
                  {items.map((item) => (
                    <SortableQueueItem
                      key={item.id}
                      item={item}
                      onChange={(text) => updateItem(item.id, { text })}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {/* Add Item Button */}
          <button
            onClick={addItem}
            className="self-end mt-2 flex items-center gap-1 px-3 py-1 border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 text-sm rounded transition"
            aria-label="Add new queue item"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
