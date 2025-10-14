"use client";

import { useState, useEffect, useRef, useCallback, useReducer } from "react";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Save, Loader2, Trash2, Columns, Filter } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

// Import extracted types, utils, and components
import {
  BulletinKanbanProps,
  KanbanState,
  KanbanCard,
  KanbanColumn,
  CardStatus,
  DEFAULT_COLUMNS,
  kanbanReducer,
  filterCards,
  migrateCardData,
  FiltersPanel,
  SortableColumn,
} from "./kanban";

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
    columns: data?.columns || DEFAULT_COLUMNS,
    cards: data?.cards ? migrateCardData(data.cards) : [],
    filters: {
      search: "",
      priority: "all",
      assignee: "all",
      dueDate: "all",
    },
    showFilters: false,
  };

  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const { columns, cards, filters, showFilters } = state;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [columnNameEdits, setColumnNameEdits] = useState<
    Record<string, string>
  >({});

  const lastSaved = useRef({
    title: initialTitle,
    columns: initialState.columns,
    cards: initialState.cards,
  });

  const sensors = useSensors(useSensor(PointerSensor));

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

  // Initialize selected card to first card when component loads
  useEffect(() => {
    if (filteredCards.length > 0 && !selectedCardId) {
      setSelectedCardId(filteredCards[0].id);
    }
    // If selected card is no longer in filtered cards, select first available card
    if (
      selectedCardId &&
      !filteredCards.find((card) => card.id === selectedCardId)
    ) {
      setSelectedCardId(filteredCards.length > 0 ? filteredCards[0].id : null);
    }
  }, [filteredCards, selectedCardId]);

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
    setSelectedCardId(newCard.id);
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

  const toggleCardExpanded = (cardId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
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

  // Keyboard navigation for cards
  useEffect(() => {
    const handleCardNavigation = (event: KeyboardEvent) => {
      if (!selectedCardId || filteredCards.length === 0) return;

      // Don't handle keyboard events when user is typing in input fields or textareas
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      const selectedCard = cards.find((card) => card.id === selectedCardId);
      if (!selectedCard) return;

      // Get cards in current column (including filtered out ones for movement)
      const currentColumnCards = cards.filter(
        (card) => card.columnId === selectedCard.columnId
      );
      const currentCardIndex = currentColumnCards.findIndex(
        (card) => card.id === selectedCardId
      );

      // Navigation with arrow keys
      if (event.key === "ArrowUp" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        // Navigate to previous card in current column
        if (currentCardIndex > 0) {
          setSelectedCardId(currentColumnCards[currentCardIndex - 1].id);
        }
      } else if (
        event.key === "ArrowDown" &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        // Navigate to next card in current column
        if (currentCardIndex < currentColumnCards.length - 1) {
          setSelectedCardId(currentColumnCards[currentCardIndex + 1].id);
        }
      } else if (
        event.key === "ArrowLeft" &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        // Navigate to previous column's first card
        const currentColumnIndex = columns.findIndex(
          (col) => col.id === selectedCard.columnId
        );
        if (currentColumnIndex > 0) {
          const prevColumn = columns[currentColumnIndex - 1];
          const prevColumnCards = cards.filter(
            (card) => card.columnId === prevColumn.id
          );
          if (prevColumnCards.length > 0) {
            setSelectedCardId(prevColumnCards[0].id);
          }
        }
      } else if (
        event.key === "ArrowRight" &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        // Navigate to next column's first card
        const currentColumnIndex = columns.findIndex(
          (col) => col.id === selectedCard.columnId
        );
        if (currentColumnIndex < columns.length - 1) {
          const nextColumn = columns[currentColumnIndex + 1];
          const nextColumnCards = cards.filter(
            (card) => card.columnId === nextColumn.id
          );
          if (nextColumnCards.length > 0) {
            setSelectedCardId(nextColumnCards[0].id);
          }
        }
      }

      // Move card between columns with Cmd/Ctrl + Left/Right
      else if ((event.metaKey || event.ctrlKey) && event.key === "ArrowLeft") {
        event.preventDefault();
        const currentColumnIndex = columns.findIndex(
          (col) => col.id === selectedCard.columnId
        );
        if (currentColumnIndex > 0) {
          const targetColumn = columns[currentColumnIndex - 1];
          const newStatus: CardStatus =
            targetColumn.id === "done"
              ? "done"
              : targetColumn.id === "in-progress"
              ? "in-progress"
              : "todo";
          updateCard(selectedCardId, {
            columnId: targetColumn.id,
            status: newStatus,
          });
        }
      } else if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        const currentColumnIndex = columns.findIndex(
          (col) => col.id === selectedCard.columnId
        );
        if (currentColumnIndex < columns.length - 1) {
          const targetColumn = columns[currentColumnIndex + 1];
          const newStatus: CardStatus =
            targetColumn.id === "done"
              ? "done"
              : targetColumn.id === "in-progress"
              ? "in-progress"
              : "todo";
          updateCard(selectedCardId, {
            columnId: targetColumn.id,
            status: newStatus,
          });
        }
      }

      // Move card within column with Ctrl + Up/Down
      else if (event.ctrlKey && event.key === "ArrowUp" && !event.metaKey) {
        event.preventDefault();
        if (currentCardIndex > 0) {
          const cardIndex = cards.findIndex(
            (card) => card.id === selectedCardId
          );
          const targetCardIndex = cards.findIndex(
            (card) => card.id === currentColumnCards[currentCardIndex - 1].id
          );
          if (cardIndex !== -1 && targetCardIndex !== -1) {
            dispatch({
              type: "SET_CARDS",
              payload: arrayMove(cards, cardIndex, targetCardIndex),
            });
          }
        }
      } else if (event.ctrlKey && event.key === "ArrowDown" && !event.metaKey) {
        event.preventDefault();
        if (currentCardIndex < currentColumnCards.length - 1) {
          const cardIndex = cards.findIndex(
            (card) => card.id === selectedCardId
          );
          const targetCardIndex = cards.findIndex(
            (card) => card.id === currentColumnCards[currentCardIndex + 1].id
          );
          if (cardIndex !== -1 && targetCardIndex !== -1) {
            dispatch({
              type: "SET_CARDS",
              payload: arrayMove(cards, cardIndex, targetCardIndex),
            });
          }
        }
      }

      // Toggle card expansion with Enter key
      else if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        toggleCardExpanded(selectedCardId);
      }

      // Delete selected card with Backspace key
      else if (event.key === "Backspace" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (selectedCardId) {
          // Find the next card to select after deletion
          const currentColumnCards = cards.filter(
            (card) => card.columnId === selectedCard.columnId
          );
          const currentCardIndex = currentColumnCards.findIndex(
            (card) => card.id === selectedCardId
          );

          let nextSelectedCardId: string | null = null;

          // Try to select the next card in the same column
          if (currentCardIndex < currentColumnCards.length - 1) {
            nextSelectedCardId = currentColumnCards[currentCardIndex + 1].id;
          }
          // If no next card in same column, try the previous card
          else if (currentCardIndex > 0) {
            nextSelectedCardId = currentColumnCards[currentCardIndex - 1].id;
          }
          // If no cards in current column, try to find a card in another column
          else {
            const remainingCards = cards.filter(
              (card) => card.id !== selectedCardId
            );
            if (remainingCards.length > 0) {
              nextSelectedCardId = remainingCards[0].id;
            }
          }

          // Delete the card
          removeCard(selectedCardId);

          // Update selection to the next card
          setSelectedCardId(nextSelectedCardId);
        }
      }
    };

    document.addEventListener("keydown", handleCardNavigation);
    return () => document.removeEventListener("keydown", handleCardNavigation);
  }, [
    selectedCardId,
    filteredCards,
    cards,
    columns,
    updateCard,
    dispatch,
    toggleCardExpanded,
    removeCard,
  ]);

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
                      <SortableColumn
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
                        onColumnNameEditChange={(value: string) =>
                          setColumnNameEdits((prev) => ({
                            ...prev,
                            [column.id]: value,
                          }))
                        }
                        activeId={activeId}
                        selectedCardId={selectedCardId}
                        expandedCards={expandedCards}
                        onToggleCardExpanded={toggleCardExpanded}
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
