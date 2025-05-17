"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";

interface KanbanCard {
  id: string;
  text: string;
  columnId: string;
}

interface KanbanColumn {
  id: string;
  title: string;
}

interface BulletinKanbanProps {
  id: string;
  title: string;
  data: { columns: KanbanColumn[]; cards: KanbanCard[] };
  onSave: (
    id: string,
    updates: { title?: string; data?: any }
  ) => Promise<void>;
  onDelete?: () => void;
}

function SortableCard({
  card,
  onChange,
  onRemove,
}: {
  card: KanbanCard;
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
  } = useSortable({ id: card.id });

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

      {/* Card Content: Edit/View Toggle */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={card.text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleKeyDown}
          placeholder="Enter card text..."
          className="flex-grow bg-transparent border-b dark:border-dark-divider px-2 py-1 text-center text-sm focus:outline-none dark:text-dark-textPrimary"
          aria-label="Edit card"
        />
      ) : (
        <button
          className="flex-grow text-left text-sm text-black text-center dark:text-dark-textPrimary overflow-y-auto focus:outline-none"
          onClick={() => setIsEditing(true)}
          aria-label="Edit card"
        >
          {card.text || (
            <span className="italic text-gray-400 overflow-y-auto">
              Untitled
            </span>
          )}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onRemove}
        className="text-red-400 hover:text-red-600 h-full"
        aria-label="Delete card"
      >
        <X className="w-4 h-4" />
      </button>
    </li>
  );
}

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col bg-gray-50 dark:bg-dark-secondary rounded-lg p-4 h-full"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab flex-shrink-0"
          >
            <GripVertical className="w-4 h-4 text-gray-400 dark:text-dark-icon" />
          </div>

          {isEditing ? (
            <input
              type="text"
              value={columnNameEdit}
              onChange={(e) => onColumnNameEditChange(e.target.value)}
              onBlur={onEditEnd}
              className="font-semibold bg-transparent border-b dark:border-dark-divider px-2 py-1 text-sm focus:outline-none dark:text-dark-textPrimary w-full"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="font-semibold text-sm dark:text-dark-textPrimary truncate flex-1">
                {column.title}
              </h3>
              <button
                onClick={onEditStart}
                className="text-gray-500 hover:text-gray-700 dark:text-dark-icon dark:hover:text-dark-accent flex-shrink-0"
                type="button"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onRemoveColumn(column.id)}
          className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Column Cards */}
      <div className="h-[calc(100vh-300px)] overflow-y-auto">
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-3">
            {cards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                onChange={(text) => onUpdateCard(card.id, { text })}
                onRemove={() => onRemoveCard(card.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </div>

      {/* Add Card Button */}
      <button
        onClick={() => onAddCard(column.id)}
        className="mt-4 flex items-center justify-center gap-1 px-3 py-2 border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 text-sm rounded transition"
        type="button"
      >
        <Plus className="w-4 h-4" />
        Add Card
      </button>
    </div>
  );
}

export default function BulletinKanban({
  id,
  title: initialTitle,
  data,
  onSave,
  onDelete,
}: BulletinKanbanProps) {
  const [title, setTitle] = useState(initialTitle);
  const [columns, setColumns] = useState<KanbanColumn[]>(
    data?.columns || [
      { id: "todo", title: "To Do" },
      { id: "in-progress", title: "In Progress" },
      { id: "done", title: "Done" },
    ]
  );
  const [cards, setCards] = useState<KanbanCard[]>(data?.cards || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [columnNameEdits, setColumnNameEdits] = useState<
    Record<string, string>
  >({});

  const lastSaved = useRef({
    title: initialTitle,
    columns: data?.columns || columns,
    cards: data?.cards || [],
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const addCard = (columnId: string) => {
    setCards([...cards, { id: crypto.randomUUID(), text: "", columnId }]);
    setHasUnsavedChanges(true);
  };

  const updateCard = (id: string, updates: Partial<KanbanCard>) => {
    setCards(
      cards.map((card) => (card.id === id ? { ...card, ...updates } : card))
    );
    setHasUnsavedChanges(true);
  };

  const removeCard = (id: string) => {
    setCards(cards.filter((card) => card.id !== id));
    setHasUnsavedChanges(true);
  };

  const addColumn = () => {
    const newColumn = {
      id: crypto.randomUUID(),
      title: "New Column",
    };
    setColumns([...columns, newColumn]);
    setHasUnsavedChanges(true);
  };

  const updateColumn = (id: string, updates: Partial<KanbanColumn>) => {
    setColumns(
      columns.map((column) =>
        column.id === id ? { ...column, ...updates } : column
      )
    );
    setHasUnsavedChanges(true);
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter((column) => column.id !== id));
    setCards(cards.filter((card) => card.columnId !== id));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(id, { title, data: { columns, cards } });
    lastSaved.current = { title, columns, cards };
    setHasUnsavedChanges(false);
    setIsSaving(false);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Handle column reordering
    if (active.id.startsWith("column-")) {
      const activeColumnId = active.id.replace("column-", "");
      const overColumnId = over.id.replace("column-", "");

      if (activeColumnId !== overColumnId) {
        const oldIndex = columns.findIndex((col) => col.id === activeColumnId);
        const newIndex = columns.findIndex((col) => col.id === overColumnId);
        setColumns(arrayMove(columns, oldIndex, newIndex));
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Handle card reordering and moving between columns
    const activeCard = cards.find((card) => card.id === active.id);
    if (!activeCard) return;

    // Check if dropping onto a column
    if (over.id.startsWith("column-")) {
      const targetColumnId = over.id.replace("column-", "");
      if (activeCard.columnId !== targetColumnId) {
        const updatedCards = cards.map((card) =>
          card.id === active.id ? { ...card, columnId: targetColumnId } : card
        );
        setCards(updatedCards);
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Handle dropping onto another card
    const overCard = cards.find((card) => card.id === over.id);
    if (!overCard) return;

    if (activeCard.columnId !== overCard.columnId) {
      // Moving to a different column
      const updatedCards = cards.map((card) =>
        card.id === active.id ? { ...card, columnId: overCard.columnId } : card
      );
      setCards(updatedCards);
      setHasUnsavedChanges(true);
    } else {
      // Reordering within the same column
      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);
      const updatedCards = arrayMove(cards, oldIndex, newIndex);
      setCards(updatedCards);
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
    <div className="border w-full h-full dark:bg-dark-background dark:border-dark-divider transition-all">
      <div className="p-4 h-full flex flex-col">
        {/* Title & Actions */}
        <div className="flex justify-between items-center">
          <input
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 mb-2 text-center dark:text-dark-textPrimary dark:focus:ring-dark-accent"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="Untitled Kanban Board"
            aria-label="Board title"
          />
          <div className="flex gap-2 ml-2">
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
                disabled={isSaving}
                className={`p-2 rounded-lg transition-colors
                  text-light-icon hover:text-light-accent hover:bg-light-hover
                  dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label="Save changes"
                type="button"
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
              aria-label="Delete board"
              type="button"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="relative border rounded-lg p-3 flex flex-col dark:border-dark-divider overflow-y-auto">
          <div className="flex-1 overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[calc(100vh-200px)]">
                <SortableContext
                  items={columns.map((col) => `column-${col.id}`)}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((column) => (
                    <SortableColumn
                      key={column.id}
                      column={column}
                      cards={cards.filter(
                        (card) => card.columnId === column.id
                      )}
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
                    />
                  ))}
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
