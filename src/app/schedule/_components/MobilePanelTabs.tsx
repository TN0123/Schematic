import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Calendar,
  Target,
  Plus,
  FileUp,
  Mic,
  RefreshCw,
  CircleArrowUp,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { Goal, GoalDuration } from "./GoalsPanel";
import GoalCard from "./GoalCard";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EventReviewModal, { ExtractedEvent } from "./EventReviewModal";
import { Event as CalendarEvent } from "../types";
import DatePickerModal from "@/app/bulletin/_components/DatePickerModal";
import DateTimePickerModal from "@/app/bulletin/_components/DateTimePickerModal";
import TodoItemMenu from "@/app/bulletin/_components/TodoItemMenu";
import {
  formatDueDate,
  formatDueDateWithTime,
  sortTodoItemsByDueDate,
} from "@/app/bulletin/_components/utils/dateHelpers";
import { getTodayInTimezone, getTomorrowInTimezone } from "@/lib/timezone";

interface MobilePanelTabsProps {
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  onCancelGeneration?: () => void;
  setShowModal: (show: boolean) => void;
  setIsIcsUploaderModalOpen: (open: boolean) => void;
  dailySummary: string;
  dailySummaryDate: Date | null;
  dailySummaryLoading: boolean;
  setEvents?: (events: CalendarEvent[]) => void;
}

export default function MobilePanelTabs({
  inputText,
  setInputText,
  loading,
  handleSubmit,
  onCancelGeneration,
  setShowModal,
  setIsIcsUploaderModalOpen,
  dailySummary,
  dailySummaryDate,
  dailySummaryLoading,
  setEvents,
}: MobilePanelTabsProps) {
  const [activeTab, setActiveTab] = useState<"events" | "goals">("events");
  // Goals data
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalToAdd, setGoalToAdd] = useState<string>("");
  const [currentDuration, setCurrentDuration] = useState<GoalDuration>(
    GoalDuration.DAILY
  );
  const [filters, setFilters] = useState<GoalDuration[]>([]);
  const [removingGoals, setRemovingGoals] = useState<string[]>([]);
  type ActiveGoalsView = "list" | "text" | "todo";
  const [activeGoalsView, setActiveGoalsView] =
    useState<ActiveGoalsView>("todo");
  const [isGoalsViewDropdownOpen, setIsGoalsViewDropdownOpen] = useState(false);

  // Goal text
  const [goalText, setGoalText] = useState<string>("");
  const [isLoadingGoalText, setIsLoadingGoalText] = useState<boolean>(false);
  const [isSavingGoalText, setIsSavingGoalText] = useState<boolean>(false);
  const [hasLoadedInitialGoalText, setHasLoadedInitialGoalText] =
    useState(false);

  // Todo bulletins
  interface TodoItem {
    id: string;
    text: string;
    checked: boolean;
    dueDate?: string;
    dueTime?: string;
    linkedEventId?: string;
  }
  interface TodoBulletin {
    id: string;
    title: string;
    data: { items: TodoItem[] };
    updatedAt: Date;
  }
  const [todoBulletins, setTodoBulletins] = useState<TodoBulletin[]>([]);
  const [selectedTodoId, setSelectedTodoId] = useState<string | undefined>(
    undefined
  );
  const [isTodoSelectorOpen, setIsTodoSelectorOpen] = useState(false);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});
  const [hasLoadedInitialTodos, setHasLoadedInitialTodos] = useState(false);
  const lastSavedTodoStateRef = useRef<string>("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerItemId, setDatePickerItemId] = useState<string | undefined>(
    undefined
  );
  const [dateTimePickerOpen, setDateTimePickerOpen] = useState(false);
  const [dateTimePickerItemId, setDateTimePickerItemId] = useState<
    string | undefined
  >(undefined);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const { data: session } = useSession();

  // File upload state
  const [extractedEvents, setExtractedEvents] = useState<
    ExtractedEvent[] | null
  >(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | undefined>(
    undefined
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript, setInputText]);

  const handleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false });
    }
  };

  useEffect(() => {
    if (activeTab === "goals") {
      fetchGoals();
      const saved = localStorage.getItem("goals-panel-active-tab");
      if (saved === "list" || saved === "text" || saved === "todo") {
        setActiveGoalsView(saved);
      }
    }
  }, [activeTab]);

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) {
        throw new Error("Failed to fetch goals");
      }
      const data = await response.json();
      setGoals(sortGoalsByDuration(data));
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  // Sort helpers matching GoalsPanel ordering
  const sortGoalsByDuration = (goalsToSort: Goal[]): Goal[] => {
    const order: Record<GoalDuration, number> = {
      [GoalDuration.DAILY]: 1,
      [GoalDuration.WEEKLY]: 2,
      [GoalDuration.MONTHLY]: 3,
      [GoalDuration.YEARLY]: 4,
    };
    return [...goalsToSort].sort((a, b) => order[a.type] - order[b.type]);
  };
  const insertGoalInOrder = (goalsList: Goal[], newGoal: Goal): Goal[] => {
    const order: Record<GoalDuration, number> = {
      [GoalDuration.DAILY]: 1,
      [GoalDuration.WEEKLY]: 2,
      [GoalDuration.MONTHLY]: 3,
      [GoalDuration.YEARLY]: 4,
    };
    const newOrder = order[newGoal.type];
    let idx = goalsList.length;
    for (let i = 0; i < goalsList.length; i++) {
      if (order[goalsList[i].type] > newOrder) {
        idx = i;
        break;
      }
    }
    const next = [...goalsList];
    next.splice(idx, 0, newGoal);
    return next;
  };

  const addGoal = async () => {
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goalToAdd,
        type: currentDuration,
      }),
    });

    const newGoal = await response.json();
    setGoals(insertGoalInOrder(goals, newGoal));
    setGoalToAdd("");
  };

  const deleteGoal = async (id: string) => {
    setRemovingGoals((prev) => [...prev, id]);

    await fetch(`/api/goals/${id}`, {
      method: "DELETE",
    });

    setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== id));
    setRemovingGoals((prev) => prev.filter((goalId) => goalId !== id));
  };

  const handleFilterChange = (duration: GoalDuration) => {
    setFilters((prevFilters) =>
      prevFilters.includes(duration)
        ? prevFilters.filter((filter) => filter !== duration)
        : [...prevFilters, duration]
    );
  };

  const filteredGoals =
    filters.length > 0
      ? goals.filter((goal) => filters.includes(goal.type))
      : goals;

  // Goal text fetch/save (debounced)
  useEffect(() => {
    if (session?.user?.email && activeTab === "goals") {
      fetchGoalText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email, activeTab]);

  useEffect(() => {
    if (!session?.user?.email || !hasLoadedInitialGoalText || isLoadingGoalText)
      return;
    const t = setTimeout(() => {
      saveGoalText(goalText);
    }, 1000);
    return () => clearTimeout(t);
  }, [
    goalText,
    session?.user?.email,
    hasLoadedInitialGoalText,
    isLoadingGoalText,
  ]);

  const fetchGoalText = async () => {
    setIsLoadingGoalText(true);
    try {
      const res = await fetch("/api/user/goal-text");
      if (!res.ok) throw new Error("Failed to fetch goal text");
      const data = await res.json();
      setGoalText(data.goalText || "");
      setHasLoadedInitialGoalText(true);
    } catch (e) {
      console.error("Error fetching goal text:", e);
    } finally {
      setIsLoadingGoalText(false);
    }
  };

  const saveGoalText = async (text: string) => {
    if (!session?.user?.email || isSavingGoalText) return;
    setIsSavingGoalText(true);
    try {
      const response = await fetch("/api/user/goal-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText: text }),
      });
      if (!response.ok) throw new Error("Failed to save goal text");
    } catch (e) {
      console.error("Error saving goal text:", e);
    } finally {
      setIsSavingGoalText(false);
    }
  };

  // Todo bulletins fetch and autosave
  useEffect(() => {
    if (activeTab === "goals" && activeGoalsView === "todo") {
      fetchTodoBulletins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeGoalsView]);

  useEffect(() => {
    if (!selectedTodoId || !hasLoadedInitialTodos) return;
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selected) return;
    const current = JSON.stringify(selected.data.items);
    if (current === lastSavedTodoStateRef.current) return;
    const t = setTimeout(() => {
      saveTodo(selectedTodoId!, selected.data.items);
    }, 1000);
    return () => clearTimeout(t);
  }, [todoBulletins, selectedTodoId, hasLoadedInitialTodos]);

  useEffect(() => {
    if (!selectedTodoId) return;
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    if (selected) {
      lastSavedTodoStateRef.current = JSON.stringify(selected.data.items);
    }
  }, [selectedTodoId, todoBulletins]);

  useEffect(() => {
    if (!selectedTodoId || !hasLoadedInitialTodos) return;
    setTimeout(() => {
      Object.values(textareaRefs.current).forEach((ta) => {
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = Math.max(20, ta.scrollHeight) + "px";
      });
    }, 100);
  }, [todoBulletins, selectedTodoId, hasLoadedInitialTodos]);

  const fetchTodoBulletins = async () => {
    try {
      const response = await fetch("/api/bulletins");
      if (!response.ok) throw new Error("Failed to fetch bulletins");
      const data = await response.json();
      const todos: TodoBulletin[] = data
        .filter((item: any) => item.type === "todo")
        .map((item: any) => ({ ...item, updatedAt: new Date(item.updatedAt) }))
        .sort(
          (a: TodoBulletin, b: TodoBulletin) =>
            b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      setTodoBulletins(todos);
      if (todos.length > 0 && !selectedTodoId) {
        setSelectedTodoId(todos[0].id);
      }
      setHasLoadedInitialTodos(true);
      if (todos.length > 0) {
        const initial = todos.find(
          (t) => t.id === (selectedTodoId || todos[0].id)
        );
        if (initial) {
          lastSavedTodoStateRef.current = JSON.stringify(initial.data.items);
        }
      }
    } catch (e) {
      console.error("Error fetching todo bulletins:", e);
    }
  };

  const saveTodo = async (id: string, items: TodoItem[]) => {
    if (isSavingTodo) return;
    setIsSavingTodo(true);
    try {
      const response = await fetch(`/api/bulletins/${id},`.replace(",", ""), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { items } }),
      });
      if (!response.ok) throw new Error("Failed to save todo");
      lastSavedTodoStateRef.current = JSON.stringify(items);
    } catch (e) {
      console.error("Error saving todo:", e);
    } finally {
      setIsSavingTodo(false);
    }
  };

  const addTodoItem = (inheritDueDate?: string) => {
    if (!selectedTodoId) return;
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selected) return;
    const newItemId = crypto.randomUUID();
    const newItems = [
      ...selected.data.items,
      { id: newItemId, text: "", checked: false, dueDate: inheritDueDate },
    ];
    setTodoBulletins((prev) =>
      prev.map((t) =>
        t.id === selectedTodoId
          ? { ...t, data: { items: newItems }, updatedAt: new Date() }
          : t
      )
    );
    setTimeout(() => {
      const ta = textareaRefs.current[newItemId];
      if (ta) ta.focus();
    }, 100);
  };

  const updateTodoItem = (itemId: string, updates: Partial<TodoItem>) => {
    if (!selectedTodoId) return;
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selected) return;
    const newItems = selected.data.items.map((item) => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates } as TodoItem;
        if (
          updates.text !== undefined &&
          item.linkedEventId &&
          item.dueDate &&
          item.dueTime
        ) {
          updateEvent(
            item.linkedEventId,
            updates.text,
            item.dueDate,
            item.dueTime
          );
        }
        return updated;
      }
      return item;
    });
    setTodoBulletins((prev) =>
      prev.map((t) =>
        t.id === selectedTodoId
          ? { ...t, data: { items: newItems }, updatedAt: new Date() }
          : t
      )
    );
  };

  const removeTodoItem = (itemId: string) => {
    if (!selectedTodoId) return;
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selected) return;
    const item = selected.data.items.find((i) => i.id === itemId);
    if (item?.linkedEventId) deleteEvent(item.linkedEventId);
    const newItems = selected.data.items.filter((i) => i.id !== itemId);
    setTodoBulletins((prev) =>
      prev.map((t) =>
        t.id === selectedTodoId
          ? { ...t, data: { items: newItems }, updatedAt: new Date() }
          : t
      )
    );
  };

  const createEvent = async (
    itemId: string,
    title: string,
    date: string,
    time: string
  ) => {
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const [year, month, day] = date.split("-").map(Number);
      const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to create event");
      const event = await response.json();
      return event.id as string;
    } catch (e) {
      console.error("Error creating event:", e);
      return null;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    } catch (e) {
      console.error("Error deleting event:", e);
    }
  };

  const updateEvent = async (
    eventId: string,
    title: string,
    date: string,
    time: string
  ) => {
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const [year, month, day] = date.split("-").map(Number);
      const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);
      await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }),
      });
    } catch (e) {
      console.error("Error updating event:", e);
    }
  };

  const handleSetDueDate = (itemId: string) => {
    setDatePickerItemId(itemId);
    setDatePickerOpen(true);
  };
  const handleSetDueDateTime = (itemId: string) => {
    setDateTimePickerItemId(itemId);
    setDateTimePickerOpen(true);
  };
  const handleSetDueToday = (itemId: string) => {
    const today = getTodayInTimezone();
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    const item = selected?.data.items.find((i) => i.id === itemId);
    if (item?.linkedEventId) deleteEvent(item.linkedEventId);
    updateTodoItem(itemId, {
      dueDate: today,
      dueTime: undefined,
      linkedEventId: undefined,
    });
  };
  const handleSetDueTomorrow = (itemId: string) => {
    const tomorrow = getTomorrowInTimezone();
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    const item = selected?.data.items.find((i) => i.id === itemId);
    if (item?.linkedEventId) deleteEvent(item.linkedEventId);
    updateTodoItem(itemId, {
      dueDate: tomorrow,
      dueTime: undefined,
      linkedEventId: undefined,
    });
  };
  const handleSaveDueDate = (date: string | null) => {
    if (datePickerItemId) {
      const selected = todoBulletins.find((t) => t.id === selectedTodoId);
      const item = selected?.data.items.find((i) => i.id === datePickerItemId);
      if (item?.linkedEventId) deleteEvent(item.linkedEventId);
      updateTodoItem(datePickerItemId!, {
        dueDate: date || undefined,
        dueTime: undefined,
        linkedEventId: undefined,
      });
    }
    setDatePickerOpen(false);
    setDatePickerItemId(undefined);
  };
  const handleSaveDueDateTime = async (
    date: string | null,
    time: string | null
  ) => {
    if (dateTimePickerItemId) {
      const selected = todoBulletins.find((t) => t.id === selectedTodoId);
      const item = selected?.data.items.find(
        (i) => i.id === dateTimePickerItemId
      );
      if (!date) {
        if (item?.linkedEventId) await deleteEvent(item.linkedEventId);
        updateTodoItem(dateTimePickerItemId!, {
          dueDate: undefined,
          dueTime: undefined,
          linkedEventId: undefined,
        });
      } else if (!time) {
        if (item?.linkedEventId) await deleteEvent(item.linkedEventId);
        updateTodoItem(dateTimePickerItemId!, {
          dueDate: date,
          dueTime: undefined,
          linkedEventId: undefined,
        });
      } else {
        if (!item) return;
        let eventId = item.linkedEventId;
        if (eventId) {
          await updateEvent(eventId, item.text, date, time);
        } else {
          eventId =
            (await createEvent(
              item.id,
              item.text || "Untitled task",
              date,
              time
            )) ?? undefined;
        }
        updateTodoItem(dateTimePickerItemId!, {
          dueDate: date,
          dueTime: time,
          linkedEventId: eventId,
        });
      }
    }
    setDateTimePickerOpen(false);
    setDateTimePickerItemId(undefined);
  };

  const handlePreviousTodo = () => {
    if (todoBulletins.length === 0 || !selectedTodoId) return;
    const currentIndex = todoBulletins.findIndex(
      (t) => t.id === selectedTodoId
    );
    const previousIndex =
      (currentIndex - 1 + todoBulletins.length) % todoBulletins.length;
    setSelectedTodoId(todoBulletins[previousIndex].id);
  };
  const handleNextTodo = () => {
    if (todoBulletins.length === 0 || !selectedTodoId) return;
    const currentIndex = todoBulletins.findIndex(
      (t) => t.id === selectedTodoId
    );
    const nextIndex = (currentIndex + 1) % todoBulletins.length;
    setSelectedTodoId(todoBulletins[nextIndex].id);
  };
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOverItem = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDropOnItem = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId || !selectedTodoId) return;
    const selected = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selected) return;
    const draggedIndex = selected.data.items.findIndex(
      (it) => it.id === draggedItem
    );
    const targetIndex = selected.data.items.findIndex(
      (it) => it.id === targetId
    );
    if (draggedIndex === -1 || targetIndex === -1) return;
    const newItems = [...selected.data.items];
    const [draggedItemData] = newItems.splice(draggedIndex, 1);
    const targetItem = selected.data.items[targetIndex];
    const updatedDraggedItem = {
      ...draggedItemData,
      dueDate: targetItem.dueDate,
    } as TodoItem;
    if (
      draggedItemData.linkedEventId &&
      draggedItemData.dueDate !== targetItem.dueDate
    ) {
      deleteEvent(draggedItemData.linkedEventId);
      updatedDraggedItem.linkedEventId = undefined;
      updatedDraggedItem.dueTime = undefined;
    }
    newItems.splice(targetIndex, 0, updatedDraggedItem);
    setTodoBulletins((prev) =>
      prev.map((t) =>
        t.id === selectedTodoId
          ? { ...t, data: { items: newItems }, updatedAt: new Date() }
          : t
      )
    );
    setDraggedItem(null);
  };

  // File upload handlers
  const handleFileUpload = async (file: File) => {
    setIsFileUploading(true);
    setFileUploadError(undefined);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const isPdf = file.type === "application/pdf";
      const uploadUrl = isPdf ? "/api/upload-pdf" : "/api/upload-image";

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.events.length === 0) {
          setFileUploadError("No events found in the file.");
        } else {
          setExtractedEvents(data.events);
        }
      } else {
        setFileUploadError("Upload failed, service is down");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setFileUploadError("An error occurred while uploading.");
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleEventReviewBack = () => {
    setExtractedEvents(null);
    setFileUploadError(undefined);
  };

  const handleAddExtractedEvents = (selectedEvents: ExtractedEvent[]) => {
    const formattedEvents = selectedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
    }));

    if (setEvents) {
      setEvents(formattedEvents);
    }

    setExtractedEvents(null);
    setFileUploadError(undefined);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b dark:border-dark-divider bg-gray-50 dark:bg-dark-secondary">
        <button
          onClick={() => setActiveTab("events")}
          className={`flex-1 py-4 px-4 text-center font-medium transition-all duration-200 touch-manipulation ${
            activeTab === "events"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-dark-background"
              : "text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover active:bg-gray-200 dark:active:bg-dark-actionSelected"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar size={18} />
            <span className="text-sm">Events</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={`flex-1 py-4 px-4 text-center font-medium transition-all duration-200 touch-manipulation ${
            activeTab === "goals"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-dark-background"
              : "text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover active:bg-gray-200 dark:active:bg-dark-actionSelected"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Target size={18} />
            <span className="text-sm">Goals</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "events" ? (
          <div className="p-4 flex flex-col gap-6">
            {/* Event Generation */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary text-base">
                Generate with AI
              </h3>
              <div className="relative">
                <textarea
                  className="w-full p-4 pr-20 pb-12 bg-gray-50 dark:bg-dark-paper border dark:border-dark-divider rounded-xl resize-none text-black dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base placeholder-gray-400 dark:placeholder-dark-textDisabled touch-manipulation"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe your schedule to generate events..."
                  rows={3}
                  style={{ fontSize: "16px" }} // Prevents zoom on iOS
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    className={`p-2 rounded-full transition-all duration-200 touch-manipulation ${
                      listening
                        ? "bg-red-500 hover:bg-red-600 active:bg-red-700"
                        : "bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover active:bg-gray-400 dark:active:bg-dark-actionSelected"
                    }`}
                    onClick={handleListen}
                    title={listening ? "Stop voice input" : "Start voice input"}
                  >
                    <Mic
                      size={18}
                      className={
                        listening
                          ? "text-white"
                          : "text-black dark:text-dark-textPrimary"
                      }
                    />
                  </button>
                  {loading ? (
                    <button
                      className="p-2 rounded-full transition-all duration-200 touch-manipulation bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover active:bg-gray-400 dark:active:bg-dark-actionSelected"
                      onClick={() => onCancelGeneration?.()}
                      title="Stop generating"
                    >
                      <Square
                        size={18}
                        fill="currentColor"
                        className="text-black dark:text-dark-textPrimary"
                      />
                    </button>
                  ) : (
                    <button
                      className="p-2 rounded-full transition-all duration-200 touch-manipulation bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover active:bg-gray-400 dark:active:bg-dark-actionSelected disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSubmit}
                      disabled={!inputText.trim()}
                      title="Generate"
                    >
                      <CircleArrowUp
                        size={18}
                        className="text-black dark:text-dark-textPrimary"
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf, image/jpeg, image/png"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* File Upload Error Message */}
            {fileUploadError && (
              <div className="px-3 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {fileUploadError}
                </p>
              </div>
            )}

            {/* File Upload Loading */}
            {isFileUploading && (
              <div className="px-3 py-4 flex items-center justify-center">
                <RefreshCw
                  size={24}
                  className="animate-spin text-blue-500 dark:text-blue-400"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-dark-textSecondary">
                  Extracting events from file...
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary text-base">
                Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-xl hover:bg-gray-200 dark:hover:bg-dark-actionHover active:bg-gray-300 dark:active:bg-dark-actionSelected transition-all duration-200 border dark:border-dark-divider text-sm font-medium touch-manipulation min-h-[44px]"
                  onClick={() => setShowModal(true)}
                >
                  <Plus size={18} />
                  Add Event
                </button>
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-xl hover:bg-gray-200 dark:hover:bg-dark-actionHover active:bg-gray-300 dark:active:bg-dark-actionSelected transition-all duration-200 border dark:border-dark-divider text-sm font-medium touch-manipulation min-h-[44px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={18} />
                  Upload
                </button>
                <button
                  className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-xl hover:bg-gray-200 dark:hover:bg-dark-actionHover active:bg-gray-300 dark:active:bg-dark-actionSelected transition-all duration-200 border dark:border-dark-divider text-sm font-medium touch-manipulation min-h-[44px]"
                  onClick={() => setIsIcsUploaderModalOpen(true)}
                >
                  <Calendar size={18} />
                  Import from .ics
                </button>
              </div>
            </div>

            <AnimatePresence>
              {dailySummary && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-2"
                >
                  <div className="text-center">
                    <p className="text-lg text-gray-500 font-bold dark:text-dark-textSecondary">
                      Daily Summary
                    </p>
                    {dailySummaryDate && (
                      <p className="text-sm text-gray-400 dark:text-dark-textDisabled">
                        {dailySummaryDate.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  {dailySummaryLoading ? (
                    <div className="flex justify-center items-center py-4">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-gray-500 dark:text-dark-textSecondary"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 px-2 dark:text-dark-textSecondary text-center prose dark:prose-invert whitespace-pre-line flex-1 overflow-y-auto">
                      <span>{dailySummary.split("ADVICE")[0]}</span>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: (props) => <p {...props} className="mt-4" />,
                        }}
                      >
                        {dailySummary.split("ADVICE")[1]}
                      </ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-6">
            {/* View selector (always), quick add (list view only) */}
            <div className="flex flex-col gap-3">
              <div className="relative self-start" id="goals-view-selector">
                <button
                  onClick={() =>
                    setIsGoalsViewDropdownOpen(!isGoalsViewDropdownOpen)
                  }
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-900 dark:text-dark-textPrimary bg-gray-100 dark:bg-dark-actionHover rounded-md border dark:border-dark-divider"
                >
                  {activeGoalsView === "list"
                    ? "List"
                    : activeGoalsView === "text"
                    ? "Text"
                    : "To-do"}
                  <ChevronDown size={16} />
                </button>
                {isGoalsViewDropdownOpen && (
                  <div className="absolute mt-2 left-0 bg-white dark:bg-dark-background border border-gray-300 dark:border-dark-divider rounded-md shadow-lg z-50">
                    {(["list", "text", "todo"] as ActiveGoalsView[]).map(
                      (v) => (
                        <button
                          key={v}
                          onClick={() => {
                            setActiveGoalsView(v);
                            setIsGoalsViewDropdownOpen(false);
                            localStorage.setItem("goals-panel-active-tab", v);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-actionHover ${
                            activeGoalsView === v
                              ? "text-gray-900 dark:text-dark-textPrimary font-medium bg-gray-50 dark:bg-dark-actionHover"
                              : "text-gray-700 dark:text-dark-textSecondary"
                          }`}
                        >
                          {v === "list"
                            ? "List"
                            : v === "text"
                            ? "Text"
                            : "To-do"}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
              {activeGoalsView === "list" && (
                <div className="flex w-full gap-2 items-stretch">
                  <select
                    value={currentDuration}
                    onChange={(e) =>
                      setCurrentDuration(e.target.value as GoalDuration)
                    }
                    className="px-3 py-2 border dark:border-dark-divider rounded-md bg-white dark:bg-dark-paper text-sm shrink-0 w-28"
                  >
                    {Object.values(GoalDuration).map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={goalToAdd}
                    onChange={(e) => setGoalToAdd(e.target.value)}
                    placeholder="New goal"
                    className="flex-1 min-w-0 px-3 py-2 border dark:border-dark-divider rounded-md bg-white dark:bg-dark-paper text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && goalToAdd.trim() !== "") {
                        addGoal();
                      }
                    }}
                  />
                  <button
                    onClick={addGoal}
                    disabled={!goalToAdd.trim()}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 shrink-0"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Render goals views */}
            {activeGoalsView === "list" && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 flex-wrap">
                  {Object.values(GoalDuration).map((duration) => (
                    <button
                      key={duration}
                      className={`text-sm font-medium px-4 py-2 rounded-full border transition-all duration-200 touch-manipulation min-h-[36px] ${
                        filters.includes(duration)
                          ? "bg-gray-900 text-white border-gray-900 dark:bg-blue-500 dark:text-white dark:border-blue-500"
                          : "text-gray-700 border-gray-300 hover:bg-gray-100 active:bg-gray-200 dark:text-dark-textSecondary dark:border-dark-divider dark:hover:bg-dark-actionHover dark:active:bg-dark-actionSelected"
                      }`}
                      onClick={() => handleFilterChange(duration)}
                    >
                      {duration}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {filteredGoals.length > 0 ? (
                    filteredGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        handleGoalClick={deleteGoal}
                        removing={removingGoals.includes(goal.id)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-dark-textSecondary text-sm">
                        No goals yet. Add one above!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeGoalsView === "text" && (
              <div className="flex flex-col h-[60vh] relative">
                {isLoadingGoalText && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-dark-background/80 z-10">
                    <div className="text-sm text-gray-600 dark:text-dark-textSecondary">
                      Loading...
                    </div>
                  </div>
                )}
                <textarea
                  className="w-full h-full resize-none border-none outline-none font-semibold text-gray-900 dark:text-dark-textPrimary bg-transparent placeholder-gray-300 dark:placeholder-dark-textSecondary focus:outline-none transition-all duration-500 ease-out p-4 leading-relaxed"
                  placeholder="What are your goals?"
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  disabled={isLoadingGoalText}
                  style={{ fontSize: "18px", lineHeight: 1.4 }}
                />
                {goalText.length > 0 && (
                  <div className="absolute bottom-3 right-4 flex items-center gap-3 text-xs text-gray-300 dark:text-dark-textSecondary opacity-60">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`w-1 h-4 rounded-full transition-all duration-300 ${
                            goalText.length > i * 75
                              ? "bg-gray-400 dark:bg-dark-textSecondary"
                              : "bg-gray-200 dark:bg-dark-divider"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-1">{goalText.length}</span>
                  </div>
                )}
              </div>
            )}

            {activeGoalsView === "todo" && (
              <div className="flex flex-col">
                {/* Selector */}
                <div className="mb-2 relative" id="todo-selector">
                  <div className="flex items-center justify-between w-full">
                    <button
                      onClick={handlePreviousTodo}
                      disabled={todoBulletins.length <= 1}
                      className="flex-shrink-0 p-2 text-gray-500 dark:text-dark-textSecondary rounded-md hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Previous todo"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setIsTodoSelectorOpen(!isTodoSelectorOpen)}
                      className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 dark:text-dark-textPrimary rounded-md hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 min-w-[140px] max-w-[200px]"
                    >
                      <span className="truncate">
                        {todoBulletins.find((t) => t.id === selectedTodoId)
                          ?.title || "Select list"}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`ml-2 ${
                          isTodoSelectorOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={handleNextTodo}
                      disabled={todoBulletins.length <= 1}
                      className="flex-shrink-0 p-2 text-gray-500 dark:text-dark-textSecondary rounded-md hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Next todo"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  {isTodoSelectorOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-dark-background border border-gray-300 dark:border-dark-divider rounded-md shadow-lg z-50 max-h-60 overflow-y-auto min-w-[160px] w-max">
                      {todoBulletins.map((todo) => (
                        <button
                          key={todo.id}
                          onClick={() => {
                            setSelectedTodoId(todo.id);
                            setIsTodoSelectorOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 ${
                            todo.id === selectedTodoId
                              ? "text-gray-900 dark:text-dark-textPrimary font-medium bg-gray-50 dark:bg-dark-actionHover"
                              : "text-gray-700 dark:text-dark-textSecondary"
                          }`}
                        >
                          {todo.title || "Untitled"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items */}
                {(() => {
                  const selected = todoBulletins.find(
                    (t) => t.id === selectedTodoId
                  );
                  if (!selected) {
                    return (
                      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                        <div className="text-gray-400 dark:text-dark-textSecondary mb-2">
                          No to-do lists found
                        </div>
                        <div className="text-sm text-gray-400 dark:text-dark-textSecondary">
                          Create a to-do list in the Bulletin section
                        </div>
                      </div>
                    );
                  }
                  const unchecked = sortTodoItemsByDueDate(
                    selected.data.items.filter((i) => !i.checked)
                  );
                  const checked = selected.data.items.filter((i) => i.checked);
                  const grouped = unchecked.reduce(
                    (groups: Record<string, TodoItem[]>, item) => {
                      const key = item.dueDate || "no-date";
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(item);
                      return groups;
                    },
                    {} as Record<string, TodoItem[]>
                  );
                  const dateKeys = Object.keys(grouped).sort((a, b) => {
                    if (a === "no-date") return -1;
                    if (b === "no-date") return 1;
                    return new Date(a).getTime() - new Date(b).getTime();
                  });
                  return (
                    <div className="flex-1 min-h-0">
                      {selected.data.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                          <div className="text-gray-400 dark:text-dark-textSecondary mb-3">
                            No tasks yet
                          </div>
                          <button
                            onClick={() => addTodoItem()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <Plus className="h-4 w-4" /> Add your first task
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <button
                            onClick={() => addTodoItem()}
                            className="flex items-center gap-2 rounded-lg px-2 py-2 text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-dark-hover dark:hover:text-dark-textPrimary transition-all duration-150 group w-full text-left text-sm mb-3"
                            aria-label="Add new todo item"
                          >
                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>Add a task</span>
                          </button>
                          {dateKeys.map((dateKey) => (
                            <div key={dateKey} className="mb-3">
                              <div className="flex items-center justify-center mb-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-textSecondary">
                                  {dateKey === "no-date"
                                    ? "No Date"
                                    : formatDueDate(dateKey)}
                                </div>
                              </div>
                              {grouped[dateKey].map((item) => (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(e) =>
                                    handleDragStart(e, item.id)
                                  }
                                  onDragOver={handleDragOverItem}
                                  onDrop={(e) => handleDropOnItem(e, item.id)}
                                  className={`group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-150 min-w-0 ${
                                    draggedItem === item.id ? "opacity-50" : ""
                                  }`}
                                >
                                  <div className="h-4 w-4 text-gray-300" />
                                  <button
                                    onClick={() =>
                                      updateTodoItem(item.id, { checked: true })
                                    }
                                    aria-label="Check task"
                                    className="relative"
                                  >
                                    <Circle className="w-4 h-4 text-gray-300" />
                                  </button>
                                  <div className="flex-grow flex items-center gap-2 min-w-0">
                                    <textarea
                                      ref={(el) => {
                                        if (el)
                                          textareaRefs.current[item.id] = el;
                                      }}
                                      rows={1}
                                      value={item.text}
                                      onChange={(e) => {
                                        e.target.style.height = "auto";
                                        e.target.style.height =
                                          Math.max(20, e.target.scrollHeight) +
                                          "px";
                                        updateTodoItem(item.id, {
                                          text: e.target.value,
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          addTodoItem(item.dueDate);
                                        } else if (
                                          e.key === "Backspace" &&
                                          e.currentTarget.value === "" &&
                                          selected.data.items.length > 1
                                        ) {
                                          e.preventDefault();
                                          removeTodoItem(item.id);
                                        }
                                      }}
                                      placeholder="Write a task..."
                                      className="flex-1 bg-transparent focus:outline-none dark:text-dark-textPrimary placeholder-gray-400 dark:placeholder-dark-textSecondary resize-none border-none text-sm leading-5 min-w-0 overflow-hidden"
                                      style={{ minHeight: "20px" }}
                                    />
                                    {item.dueTime && (
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs font-medium flex-shrink-0">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                          {format(
                                            new Date(
                                              `2000-01-01T${item.dueTime}`
                                            ),
                                            "h:mm a"
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <TodoItemMenu
                                    onSetDueDate={() =>
                                      handleSetDueDate(item.id)
                                    }
                                    onSetDueDateTime={() =>
                                      handleSetDueDateTime(item.id)
                                    }
                                    onSetDueToday={() =>
                                      handleSetDueToday(item.id)
                                    }
                                    onSetDueTomorrow={() =>
                                      handleSetDueTomorrow(item.id)
                                    }
                                  />
                                  <button
                                    onClick={() => removeTodoItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-hover dark:hover:text-dark-textPrimary"
                                    aria-label="Delete item"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ))}

                          {checked.length > 0 && (
                            <div className="mt-6 space-y-1">
                              <div className="flex items-center gap-2 py-2">
                                <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
                                <span className="text-xs font-medium text-gray-500 dark:text-dark-textSecondary">
                                  Completed • {checked.length}
                                </span>
                                <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
                              </div>
                              {checked.map((item) => (
                                <div
                                  key={item.id}
                                  className="group flex items-center gap-2 rounded-lg px-2 py-2 opacity-60 hover:opacity-80 transition-all duration-150 min-w-0"
                                >
                                  <button
                                    onClick={() =>
                                      updateTodoItem(item.id, {
                                        checked: false,
                                      })
                                    }
                                    aria-label="Uncheck task"
                                    className="relative"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  </button>
                                  <div className="flex-grow flex items-center min-w-0">
                                    <div className="flex items-center gap-2 w-full min-w-0">
                                      <textarea
                                        ref={(el) => {
                                          if (el)
                                            textareaRefs.current[item.id] = el;
                                        }}
                                        rows={1}
                                        value={item.text}
                                        onChange={(e) => {
                                          e.target.style.height = "auto";
                                          e.target.style.height =
                                            Math.max(
                                              20,
                                              e.target.scrollHeight
                                            ) + "px";
                                          updateTodoItem(item.id, {
                                            text: e.target.value,
                                          });
                                        }}
                                        className="flex-grow bg-transparent focus:outline-none line-through text-gray-500 dark:text-dark-textSecondary resize-none border-none text-sm leading-5 min-w-0 overflow-hidden"
                                        style={{ minHeight: "20px" }}
                                      />
                                      {item.dueDate && (
                                        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-dark-textSecondary flex-shrink-0">
                                          <span>
                                            {item.dueTime
                                              ? formatDueDateWithTime(
                                                  item.dueDate,
                                                  item.dueTime
                                                )
                                              : formatDueDate(item.dueDate)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeTodoItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-hover dark:hover:text-dark-textPrimary"
                                    aria-label="Delete item"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isSavingTodo && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-dark-textSecondary">
                          Saving...
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Date Modals */}
            <DatePickerModal
              isOpen={datePickerOpen}
              onClose={() => setDatePickerOpen(false)}
              onSave={handleSaveDueDate}
              currentDate={
                datePickerItemId && selectedTodoId
                  ? todoBulletins
                      .find((t) => t.id === selectedTodoId)
                      ?.data.items.find((item) => item.id === datePickerItemId)
                      ?.dueDate
                  : undefined
              }
            />
            <DateTimePickerModal
              isOpen={dateTimePickerOpen}
              onClose={() => setDateTimePickerOpen(false)}
              onSave={handleSaveDueDateTime}
              currentDate={
                dateTimePickerItemId && selectedTodoId
                  ? todoBulletins
                      .find((t) => t.id === selectedTodoId)
                      ?.data.items.find(
                        (item) => item.id === dateTimePickerItemId
                      )?.dueDate
                  : undefined
              }
              currentTime={
                dateTimePickerItemId && selectedTodoId
                  ? todoBulletins
                      .find((t) => t.id === selectedTodoId)
                      ?.data.items.find(
                        (item) => item.id === dateTimePickerItemId
                      )?.dueTime
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Event Review Modal */}
      {extractedEvents && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-dark-secondary rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                Review Extracted Events
              </h2>
              <button
                onClick={handleEventReviewBack}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-textSecondary text-lg font-bold"
              >
                ×
              </button>
            </div>
            <EventReviewModal
              events={extractedEvents}
              onBack={handleEventReviewBack}
              onAddAll={handleAddExtractedEvents}
            />
          </div>
        </div>
      )}
    </div>
  );
}
