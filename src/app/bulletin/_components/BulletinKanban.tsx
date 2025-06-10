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
  Clock,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

interface KanbanCard {
  id: string;
  text: string;
  columnId: string;
}

interface KanbanColumn {
  id: string;
  title: string;
}

type KanbanState = {
  columns: KanbanColumn[];
  cards: KanbanCard[];
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
  | { type: "SET_CARDS"; payload: KanbanCard[] };

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

interface SortableCardProps {
  card: KanbanCard;
  onChange: (text: string) => void;
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 sm:py-2 border dark:border-dark-divider bg-white dark:bg-dark-secondary cursor-grab active:cursor-grabbing touch-manipulation h-12 sm:h-16"
    >
      {/* Grip Icon */}
      <div className="flex-shrink-0" {...attributes} {...listeners}>
        <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 dark:text-dark-icon" />
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
          className="flex-grow bg-transparent w-full border-b dark:border-dark-divider text-center text-xs sm:text-sm focus:outline-none dark:text-dark-textPrimary"
          aria-label="Edit card"
          autoFocus
        />
      ) : (
        <button
          className="flex-grow text-left text-xs sm:text-sm text-black text-center dark:text-dark-textPrimary focus:outline-none overflow-x-auto max-h-full"
          onClick={() => setIsEditing(true)}
        >
          {card.text || <span className="italic text-gray-400">Untitled</span>}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onRemove}
        className="text-red-400 hover:text-red-600 h-full flex-shrink-0"
        aria-label="Delete card"
      >
        <X className="w-3 h-3 sm:w-4 sm:h-4" />
      </button>
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
              <h3 className="font-semibold text-xs sm:text-sm dark:text-dark-textPrimary truncate flex-1">
                {column.title}
              </h3>
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
                onChange={(text) => onUpdateCard(card.id, { text })}
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

  const initialState: KanbanState = {
    columns: data?.columns || [
      { id: "todo", title: "To Do" },
      { id: "in-progress", title: "In Progress" },
      { id: "done", title: "Done" },
    ],
    cards: data?.cards || [],
  };

  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const { columns, cards } = state;

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
    const newCard = { id: crypto.randomUUID(), text: "", columnId };
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(id, { title, data: { columns, cards } });
      lastSaved.current = { title, columns, cards };
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
          const newCards = cards.map((c) =>
            c.id === active.id ? { ...c, columnId: newColumnId } : c
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
      const newCards = cards.map((c) =>
        c.id === active.id ? { ...c, columnId: newColumnId } : c
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <input
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 mb-2 text-center dark:text-dark-textPrimary dark:bg-dark-background dark:focus:ring-dark-accent"
            value={title}
            onChange={(e) => {
              const newTitle = e.target.value;
              setTitle(newTitle);
              setHasUnsavedChanges(true);
              debouncedSaveTitle(newTitle);
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
                  {columns.map((column) => (
                    <MemoizedSortableColumn
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
                      activeId={activeId}
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
