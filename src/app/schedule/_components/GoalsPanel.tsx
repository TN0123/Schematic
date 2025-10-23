import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CheckCircle,
  Plus,
  Loader2,
  Clock,
} from "lucide-react";
import GoalCard from "./GoalCard";
import DatePickerModal from "@/app/bulletin/_components/DatePickerModal";
import DateTimePickerModal from "@/app/bulletin/_components/DateTimePickerModal";
import TodoItemMenu from "@/app/bulletin/_components/TodoItemMenu";
import {
  formatDueDate,
  formatDueDateWithTime,
  sortTodoItemsByDueDate,
} from "@/app/bulletin/_components/utils/dateHelpers";
import { getTodayInTimezone, getTomorrowInTimezone } from "@/lib/timezone";

export enum GoalDuration {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export interface Goal {
  id: string;
  title: string;
  type: GoalDuration;
}

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  dueTime?: string; // Time string (HH:MM)
  linkedEventId?: string; // ID of the linked calendar event
}

interface TodoBulletin {
  id: string;
  title: string;
  data: { items: TodoItem[] };
  updatedAt: Date;
}

type ActiveTab = "list" | "text" | "todo";

interface GoalsPanelProps {
  width?: number;
  className?: string;
}

export default function GoalsPanel({
  width,
  className = "",
}: GoalsPanelProps = {}) {
  const [goalToAdd, setGoalToAdd] = useState<string>("");
  const [currentDuration, setCurrentDuration] = useState<GoalDuration>(
    GoalDuration.DAILY
  );
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filters, setFilters] = useState<GoalDuration[]>([]);
  const [removingGoals, setRemovingGoals] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("todo");
  const [isMounted, setIsMounted] = useState(false);

  const [goalText, setGoalText] = useState<string>("");
  const [isLoadingGoalText, setIsLoadingGoalText] = useState<boolean>(false);
  const [isSavingGoalText, setIsSavingGoalText] = useState<boolean>(false);
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [todoBulletins, setTodoBulletins] = useState<TodoBulletin[]>([]);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [isTodoSelectorOpen, setIsTodoSelectorOpen] = useState(false);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});
  const [hasLoadedInitialTodos, setHasLoadedInitialTodos] = useState(false);
  const lastSavedTodoStateRef = useRef<string>("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerItemId, setDatePickerItemId] = useState<string | null>(null);
  const [dateTimePickerOpen, setDateTimePickerOpen] = useState(false);
  const [dateTimePickerItemId, setDateTimePickerItemId] = useState<
    string | null
  >(null);

  // Sort goals by duration type in the order: DAILY, WEEKLY, MONTHLY, YEARLY
  const sortGoalsByDuration = (goalsToSort: Goal[]): Goal[] => {
    const durationOrder = {
      [GoalDuration.DAILY]: 1,
      [GoalDuration.WEEKLY]: 2,
      [GoalDuration.MONTHLY]: 3,
      [GoalDuration.YEARLY]: 4,
    };

    return [...goalsToSort].sort((a, b) => {
      const orderA = durationOrder[a.type];
      const orderB = durationOrder[b.type];
      return orderA - orderB;
    });
  };

  // Efficiently insert a goal at the correct position without sorting the entire array
  const insertGoalInOrder = (goalsList: Goal[], newGoal: Goal): Goal[] => {
    const durationOrder = {
      [GoalDuration.DAILY]: 1,
      [GoalDuration.WEEKLY]: 2,
      [GoalDuration.MONTHLY]: 3,
      [GoalDuration.YEARLY]: 4,
    };

    const newGoalOrder = durationOrder[newGoal.type];

    // Find the correct insertion position
    let insertIndex = goalsList.length;
    for (let i = 0; i < goalsList.length; i++) {
      if (durationOrder[goalsList[i].type] > newGoalOrder) {
        insertIndex = i;
        break;
      }
    }

    // Insert the goal at the correct position
    const updatedGoals = [...goalsList];
    updatedGoals.splice(insertIndex, 0, newGoal);
    return updatedGoals;
  };

  useEffect(() => {
    fetchGoals();
    setIsMounted(true);
  }, []);

  // Load saved active tab from localStorage after mount (client-side only)
  useEffect(() => {
    if (isMounted) {
      const savedTab = localStorage.getItem(
        "goals-panel-active-tab"
      ) as ActiveTab;
      if (
        savedTab &&
        (savedTab === "list" || savedTab === "text" || savedTab === "todo")
      ) {
        setActiveTab(savedTab);
      }
    }
  }, [isMounted]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("goals-panel-active-tab", activeTab);
    }
  }, [activeTab, isMounted]);

  // Separate useEffect for fetchGoalText that depends on session
  useEffect(() => {
    if (session?.user?.email) {
      fetchGoalText();
    }
  }, [session?.user?.email]);

  // Fetch todo bulletins when switching to todo tab (also runs on mount)
  useEffect(() => {
    if (activeTab === "todo") {
      fetchTodoBulletins();
    }
  }, [activeTab]);

  // Track if goal text has been initially loaded
  const [hasLoadedInitialGoalText, setHasLoadedInitialGoalText] =
    useState(false);

  // Debounce goal text saving
  useEffect(() => {
    if (!session?.user?.email || !hasLoadedInitialGoalText || isLoadingGoalText)
      return;

    const timeoutId = setTimeout(() => {
      saveGoalText(goalText);
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timeoutId);
  }, [
    goalText,
    session?.user?.email,
    hasLoadedInitialGoalText,
    isLoadingGoalText,
  ]);

  useEffect(() => {
    // Add scroll lock effect for mobile
    if (isMobileOpen) {
      // Prevent scrolling on the body when panel is open
      document.body.style.overflow = "hidden";
    } else {
      // Restore scrolling when panel is closed
      document.body.style.overflow = "unset";
    }

    // Cleanup function to ensure scrolling is restored when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  useEffect(() => {
    // Close mobile panel when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isMobileOpen && !target.closest("#goals-panel")) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileOpen]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isDropdownOpen && !target.closest("#view-dropdown")) {
        setIsDropdownOpen(false);
      }
      if (isTodoSelectorOpen && !target.closest("#todo-selector")) {
        setIsTodoSelectorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isTodoSelectorOpen]);

  // Debounce todo saving - save after 1 second of no changes
  useEffect(() => {
    if (!selectedTodoId || !hasLoadedInitialTodos) return;

    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selectedTodo) return;

    const currentStateString = JSON.stringify(selectedTodo.data.items);

    // Only save if the state has actually changed from the last saved state
    if (currentStateString === lastSavedTodoStateRef.current) return;

    const timeoutId = setTimeout(() => {
      saveTodo(selectedTodoId, selectedTodo.data.items);
    }, 1000); // Save after 1 second of no changes

    return () => clearTimeout(timeoutId);
  }, [todoBulletins, selectedTodoId, hasLoadedInitialTodos]);

  // Update lastSavedTodoStateRef when switching between different todos
  useEffect(() => {
    if (!selectedTodoId) return;

    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    if (selectedTodo) {
      lastSavedTodoStateRef.current = JSON.stringify(selectedTodo.data.items);
    }
  }, [selectedTodoId]);

  // Adjust textarea heights when todo items change or component mounts
  useEffect(() => {
    if (!selectedTodoId || !hasLoadedInitialTodos) return;

    // Small delay to ensure DOM is updated
    setTimeout(() => {
      Object.values(textareaRefs.current).forEach((textarea) => {
        if (textarea) {
          textarea.style.height = "auto";
          textarea.style.height = Math.max(20, textarea.scrollHeight) + "px";
        }
      });
    }, 100);
  }, [todoBulletins, selectedTodoId, hasLoadedInitialTodos]);

  const handleFilterChange = (duration: GoalDuration) => {
    setFilters((prevFilters) =>
      prevFilters.includes(duration)
        ? prevFilters.filter((filter) => filter !== duration)
        : [...prevFilters, duration]
    );
  };

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

  const fetchGoalText = async () => {
    if (!session?.user?.email) return;

    setIsLoadingGoalText(true);
    try {
      const response = await fetch("/api/user/goal-text");
      if (!response.ok) {
        throw new Error("Failed to fetch goal text");
      }
      const data = await response.json();
      setGoalText(data.goalText || "");
      setHasLoadedInitialGoalText(true);
    } catch (error) {
      console.error("Error fetching goal text:", error);
    } finally {
      setIsLoadingGoalText(false);
    }
  };

  const fetchTodoBulletins = async () => {
    try {
      const response = await fetch("/api/bulletins");
      if (!response.ok) {
        throw new Error("Failed to fetch bulletins");
      }
      const data = await response.json();
      const todos = data
        .filter((item: any) => item.type === "todo")
        .map((item: any) => ({
          ...item,
          updatedAt: new Date(item.updatedAt),
        }))
        .sort(
          (a: TodoBulletin, b: TodoBulletin) =>
            b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      setTodoBulletins(todos);
      if (todos.length > 0 && !selectedTodoId) {
        setSelectedTodoId(todos[0].id);
      }
      setHasLoadedInitialTodos(true);

      // Set initial saved state
      if (todos.length > 0) {
        const initialTodo = todos.find(
          (t: TodoBulletin) => t.id === (selectedTodoId || todos[0].id)
        );
        if (initialTodo) {
          lastSavedTodoStateRef.current = JSON.stringify(
            initialTodo.data.items
          );
        }
      }
    } catch (error) {
      console.error("Error fetching todo bulletins:", error);
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

      if (!response.ok) {
        throw new Error("Failed to save goal text");
      }
    } catch (error) {
      console.error("Error saving goal text:", error);
    } finally {
      setIsSavingGoalText(false);
    }
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
  };

  const deleteGoal = async (id: string) => {
    setRemovingGoals((prev) => [...prev, id]);

    await fetch(`/api/goals/${id}`, {
      method: "DELETE",
    });

    setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== id));
    setRemovingGoals((prev) => prev.filter((id) => id !== id));
  };

  const saveTodo = async (id: string, items: TodoItem[]) => {
    if (isSavingTodo) return;

    setIsSavingTodo(true);
    try {
      const response = await fetch(`/api/bulletins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { items } }),
      });

      if (!response.ok) {
        throw new Error("Failed to save todo");
      }

      // Update the last saved state after successful save
      lastSavedTodoStateRef.current = JSON.stringify(items);
    } catch (error) {
      console.error("Error saving todo:", error);
    } finally {
      setIsSavingTodo(false);
    }
  };

  const addTodoItem = (inheritDueDate?: string) => {
    if (!selectedTodoId) return;
    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selectedTodo) return;

    const newItemId = crypto.randomUUID();
    const newItems = [
      ...selectedTodo.data.items,
      { id: newItemId, text: "", checked: false, dueDate: inheritDueDate },
    ];

    // Update local state immediately
    setTodoBulletins((prev) =>
      prev.map((todo) =>
        todo.id === selectedTodoId
          ? { ...todo, data: { items: newItems }, updatedAt: new Date() }
          : todo
      )
    );

    setTimeout(() => {
      const textarea = textareaRefs.current[newItemId];
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  const updateTodoItem = (itemId: string, updates: Partial<TodoItem>) => {
    if (!selectedTodoId) return;
    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selectedTodo) return;

    const newItems = selectedTodo.data.items.map((item) => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates };

        // If text is being updated and item has a linked event, update the event title
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

        return updatedItem;
      }
      return item;
    });

    // Update local state immediately
    setTodoBulletins((prev) =>
      prev.map((todo) =>
        todo.id === selectedTodoId
          ? { ...todo, data: { items: newItems }, updatedAt: new Date() }
          : todo
      )
    );
  };

  const removeTodoItem = (itemId: string) => {
    if (!selectedTodoId) return;
    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    if (!selectedTodo) return;

    const item = selectedTodo.data.items.find((item) => item.id === itemId);

    // If item has a linked event, delete it
    if (item?.linkedEventId) {
      deleteEvent(item.linkedEventId);
    }

    const newItems = selectedTodo.data.items.filter(
      (item) => item.id !== itemId
    );

    // Update local state immediately
    setTodoBulletins((prev) =>
      prev.map((todo) =>
        todo.id === selectedTodoId
          ? { ...todo, data: { items: newItems }, updatedAt: new Date() }
          : todo
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

      // Construct date in local timezone
      const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30); // 30-minute duration

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
      return event.id;
    } catch (error) {
      console.error("Error creating event:", error);
      return null;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting event:", error);
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

      // Construct date in local timezone
      const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30); // 30-minute duration

      await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }),
      });
    } catch (error) {
      console.error("Error updating event:", error);
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
    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    const item = selectedTodo?.data.items.find((i) => i.id === itemId);

    // If item has a linked event, delete it
    if (item?.linkedEventId) {
      deleteEvent(item.linkedEventId);
    }

    updateTodoItem(itemId, {
      dueDate: today,
      dueTime: undefined,
      linkedEventId: undefined,
    });
  };

  const handleSetDueTomorrow = (itemId: string) => {
    const tomorrow = getTomorrowInTimezone();
    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    const item = selectedTodo?.data.items.find((i) => i.id === itemId);

    // If item has a linked event, delete it
    if (item?.linkedEventId) {
      deleteEvent(item.linkedEventId);
    }

    updateTodoItem(itemId, {
      dueDate: tomorrow,
      dueTime: undefined,
      linkedEventId: undefined,
    });
  };

  const handleSaveDueDate = (date: string | null) => {
    if (datePickerItemId) {
      const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
      const item = selectedTodo?.data.items.find(
        (i) => i.id === datePickerItemId
      );

      // If item has a linked event, delete it since we're removing the time
      if (item?.linkedEventId) {
        deleteEvent(item.linkedEventId);
      }

      updateTodoItem(datePickerItemId, {
        dueDate: date || undefined,
        dueTime: undefined,
        linkedEventId: undefined,
      });
    }
    setDatePickerOpen(false);
    setDatePickerItemId(null);
  };

  const handleSaveDueDateTime = async (
    date: string | null,
    time: string | null
  ) => {
    if (dateTimePickerItemId) {
      const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
      const item = selectedTodo?.data.items.find(
        (i) => i.id === dateTimePickerItemId
      );

      if (!date) {
        // Clear everything
        if (item?.linkedEventId) {
          await deleteEvent(item.linkedEventId);
        }
        updateTodoItem(dateTimePickerItemId, {
          dueDate: undefined,
          dueTime: undefined,
          linkedEventId: undefined,
        });
      } else if (!time) {
        // Date only, no time - remove event if exists
        if (item?.linkedEventId) {
          await deleteEvent(item.linkedEventId);
        }
        updateTodoItem(dateTimePickerItemId, {
          dueDate: date,
          dueTime: undefined,
          linkedEventId: undefined,
        });
      } else {
        // Date and time - create or update event
        if (!item) return;

        let eventId = item.linkedEventId;

        if (eventId) {
          // Update existing event
          await updateEvent(eventId, item.text, date, time);
        } else {
          // Create new event
          eventId = await createEvent(
            dateTimePickerItemId,
            item.text || "Untitled task",
            date,
            time
          );
        }

        updateTodoItem(dateTimePickerItemId, {
          dueDate: date,
          dueTime: time,
          linkedEventId: eventId || undefined,
        });
      }
    }
    setDateTimePickerOpen(false);
    setDateTimePickerItemId(null);
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

  const MobileToggle = () => (
    <button
      onClick={() => setIsMobileOpen(true)}
      className="md:hidden fixed top-[9rem] left-20 z-20 bg-white dark:bg-dark-background p-2 rounded-lg shadow-md dark:shadow-dark-divider border dark:border-dark-divider"
      aria-label="Open goals panel"
    >
      <Menu size={20} className="text-gray-700 dark:text-dark-textSecondary" />
    </button>
  );

  const renderListTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex gap-3 my-4 justify-center">
        {Object.values(GoalDuration).map((duration) => (
          <button
            key={duration}
            className={`text-gray-900 dark:text-dark-textSecondary text-xs font-medium px-2 py-2 shadow-sm rounded-md border border-gray-300 dark:border-dark-divider hover:bg-gray-900 dark:hover:bg-dark-actionHover hover:text-white focus:outline-none transition-all duration-200 ${
              filters.includes(duration)
                ? "bg-gray-900 dark:bg-dark-actionHover text-white"
                : ""
            }`}
            onClick={() => handleFilterChange(duration)}
          >
            {duration.charAt(0).toUpperCase() + duration.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 py-4 overflow-y-auto flex-1 w-full">
        {goals.map(
          (goal) =>
            (filters.length === 0 || filters.includes(goal.type)) && (
              <GoalCard
                key={goal.id}
                goal={goal}
                handleGoalClick={deleteGoal}
                removing={removingGoals.includes(goal.id)}
              />
            )
        )}
      </div>

      <div className="flex gap-2 mt-2 text-sm justify-center items-center">
        <select
          id="goalType"
          className="border rounded-md px-2 py-2 dark:bg-dark-background dark:text-dark-textPrimary dark:border-dark-divider focus:outline-none transition-all duration-200"
          value={currentDuration}
          onChange={(e) => {
            setCurrentDuration(e.target.value.toUpperCase() as GoalDuration);
          }}
        >
          {Object.values(GoalDuration).map((duration) => (
            <option key={duration} value={duration}>
              {duration.charAt(0).toUpperCase() +
                duration.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="border dark:border-dark-divider px-2 py-2 rounded-md text-center text-md dark:bg-dark-background dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-dark-accent focus:border-dark-accent transition-all duration-200"
          onChange={(e) => setGoalToAdd(e.target.value)}
          value={goalToAdd}
          placeholder="Add a new goal..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && goalToAdd.trim() !== "") {
              addGoal();
              setGoalToAdd("");
            }
          }}
        />
      </div>
    </div>
  );

  const calculateDynamicSizing = () => {
    const charCount = goalText.length;

    // Start with very large text and scale down dramatically
    let fontSize = 32; // Much larger starting size
    let lineHeight = 1.2;
    let letterSpacing = "normal";

    if (charCount > 0) {
      // More dramatic scaling - text gets much smaller as content grows
      if (charCount <= 50) {
        fontSize = Math.max(28, 32 - charCount / 10); // Very large for short text
      } else if (charCount <= 150) {
        fontSize = Math.max(20, 28 - (charCount - 50) / 15); // Medium size for medium text
      } else if (charCount <= 300) {
        fontSize = Math.max(16, 20 - (charCount - 150) / 25); // Smaller for longer text
      } else {
        fontSize = Math.max(14, 16 - (charCount - 300) / 50); // Very small for very long text
      }

      // Adjust spacing based on content amount
      if (charCount > 200) {
        lineHeight = 1.4; // More breathing room for dense content
        letterSpacing = "0.01em";
      } else if (charCount > 100) {
        lineHeight = 1.3;
      }
    }

    return { fontSize, lineHeight, letterSpacing };
  };

  const { fontSize, lineHeight, letterSpacing } = calculateDynamicSizing();

  const renderTextTab = () => (
    <div className="flex flex-col h-full relative">
      {isLoadingGoalText && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-dark-background/80 z-10">
          <div className="text-sm text-gray-600 dark:text-dark-textSecondary">
            Loading...
          </div>
        </div>
      )}

      <textarea
        className="w-full h-full resize-none border-none outline-none font-semibold text-gray-900 dark:text-dark-textPrimary bg-transparent placeholder-gray-300 dark:placeholder-dark-textSecondary focus:outline-none transition-all duration-500 ease-out p-8 leading-relaxed"
        placeholder="What are your goals?"
        value={goalText}
        onChange={(e) => setGoalText(e.target.value)}
        disabled={isLoadingGoalText}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          letterSpacing: letterSpacing,
          fontWeight: goalText.length > 200 ? "500" : "600",
        }}
      />

      {/* Visual feedback for text scaling and save status */}
      {goalText.length > 0 && (
        <div className="absolute bottom-4 right-6 flex items-center gap-3 text-xs text-gray-300 dark:text-dark-textSecondary opacity-60">
          {/* Content density bars */}
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
  );

  const renderTodoTab = () => {
    const selectedTodo = todoBulletins.find((t) => t.id === selectedTodoId);
    const uncheckedItems = sortTodoItemsByDueDate(
      selectedTodo?.data.items.filter((item) => !item.checked) || []
    );
    const checkedItems =
      selectedTodo?.data.items.filter((item) => item.checked) || [];

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
    const hasItemsWithDates =
      selectedTodo?.data.items.some((item) => item.dueDate) || false;

    // Calculate today's progress (only for items due today)
    const today = getTodayInTimezone();
    const todayItems =
      selectedTodo?.data.items.filter((item) => item.dueDate === today) || [];
    const todayCheckedItems = todayItems.filter((item) => item.checked);

    if (todoBulletins.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="text-gray-400 dark:text-dark-textSecondary mb-2">
            No to-do lists found
          </div>
          <div className="text-sm text-gray-400 dark:text-dark-textSecondary">
            Create a to-do list in the Bulletin section first
          </div>
        </div>
      );
    }

    if (!selectedTodo) return null;

    return (
      <div className="flex flex-col h-full justify-center">
        {/* Todo Selector with Navigation */}
        <div className="mb-4 relative" id="todo-selector">
          <div className="flex items-center justify-between w-full">
            {/* Previous Button */}
            <button
              onClick={handlePreviousTodo}
              disabled={todoBulletins.length <= 1}
              className="flex-shrink-0 p-2 text-gray-500 dark:text-dark-textSecondary rounded-md hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Previous todo"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dropdown */}
            <button
              onClick={() => setIsTodoSelectorOpen(!isTodoSelectorOpen)}
              className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 dark:text-dark-textPrimary rounded-md hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 min-w-[140px] max-w-[180px]"
            >
              <span className="truncate">
                {selectedTodo.title || "Untitled"}
              </span>
              <ChevronDown
                size={16}
                className={`ml-2 flex-shrink-0 transition-transform duration-200 text-gray-500 dark:text-dark-textSecondary ${
                  isTodoSelectorOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Next Button */}
            <button
              onClick={handleNextTodo}
              disabled={todoBulletins.length <= 1}
              className="flex-shrink-0 p-2 text-gray-500 dark:text-dark-textSecondary rounded-md hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Next todo"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {isTodoSelectorOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-dark-background border border-gray-300 dark:border-dark-divider rounded-md shadow-lg z-50 max-h-60 overflow-y-auto min-w-[140px] max-w-[180px] w-max">
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

        {/* Progress Indicator */}
        {selectedTodo && selectedTodo.data.items.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-dark-textSecondary mb-1">
              <span>
                {hasItemsWithDates && todayItems.length > 0
                  ? "Today's progress"
                  : "Progress"}
              </span>
              <span>
                {hasItemsWithDates && todayItems.length > 0
                  ? `${todayCheckedItems.length}/${todayItems.length} completed`
                  : `${checkedItems.length}/${selectedTodo.data.items.length} completed`}
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
                      : selectedTodo.data.items.length > 0
                      ? (checkedItems.length / selectedTodo.data.items.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Todo Items Container (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {selectedTodo.data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="text-gray-400 dark:text-dark-textSecondary mb-4">
                No tasks yet
              </div>
              <button
                onClick={() => addTodoItem()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add your first task
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Add Item Button */}
              <button
                onClick={() => addTodoItem()}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-dark-hover dark:hover:text-gray-300 transition-all duration-150 group w-full text-left text-sm mb-3"
                aria-label="Add new todo item"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Add a task</span>
              </button>

              {/* Unchecked Items - Grouped by Date */}
              {dateKeys.map((dateKey) => {
                const itemsInGroup = groupedItems[dateKey];

                return (
                  <div key={dateKey} className="mb-3">
                    {/* Date Header */}
                    <div className="flex items-center justify-center mb-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-textSecondary">
                        {dateKey === "no-date"
                          ? "No Date"
                          : formatDueDate(dateKey)}
                      </div>
                    </div>

                    {/* Items in this date group */}
                    {itemsInGroup.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-150"
                      >
                        <button
                          onClick={() =>
                            updateTodoItem(item.id, { checked: true })
                          }
                          aria-label="Check task"
                          className="relative"
                        >
                          <Circle className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
                        </button>
                        <div className="flex-grow flex items-center gap-2">
                          <textarea
                            ref={(el) => {
                              if (el) textareaRefs.current[item.id] = el;
                            }}
                            rows={1}
                            value={item.text}
                            onChange={(e) => {
                              e.target.style.height = "auto";
                              e.target.style.height =
                                Math.max(20, e.target.scrollHeight) + "px";
                              updateTodoItem(item.id, { text: e.target.value });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                addTodoItem(item.dueDate);
                              } else if (
                                e.key === "Backspace" &&
                                e.currentTarget.value === "" &&
                                selectedTodo.data.items.length > 1
                              ) {
                                e.preventDefault();
                                removeTodoItem(item.id);
                              }
                            }}
                            placeholder="Write a task..."
                            className="flex-1 bg-transparent focus:outline-none dark:text-dark-textPrimary placeholder-gray-400 dark:placeholder-dark-textSecondary resize-none border-none text-sm leading-5"
                            style={{ minHeight: "20px" }}
                          />
                          {item.dueTime && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs font-medium flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              <span>
                                {format(
                                  new Date(`2000-01-01T${item.dueTime}`),
                                  "h:mm a"
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <TodoItemMenu
                          onSetDueDate={() => handleSetDueDate(item.id)}
                          onSetDueDateTime={() => handleSetDueDateTime(item.id)}
                          onSetDueToday={() => handleSetDueToday(item.id)}
                          onSetDueTomorrow={() => handleSetDueTomorrow(item.id)}
                        />
                        <button
                          onClick={() => removeTodoItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-hover dark:hover:text-gray-300"
                          aria-label="Delete item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Completed Items */}
              {checkedItems.length > 0 && (
                <div className="mt-6 space-y-1">
                  <div className="flex items-center gap-2 py-2">
                    <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
                    <span className="text-xs font-medium text-gray-500 dark:text-dark-textSecondary">
                      Completed • {checkedItems.length}
                    </span>
                    <hr className="flex-grow border-gray-200 dark:border-dark-divider" />
                  </div>
                  {checkedItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-2 rounded-lg px-2 py-2 opacity-60 hover:opacity-80 transition-all duration-150"
                    >
                      <button
                        onClick={() =>
                          updateTodoItem(item.id, { checked: false })
                        }
                        aria-label="Uncheck task"
                        className="relative"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </button>
                      <div className="flex-grow flex items-center">
                        <div className="flex items-center gap-2 w-full">
                          <textarea
                            ref={(el) => {
                              if (el) textareaRefs.current[item.id] = el;
                            }}
                            rows={1}
                            value={item.text}
                            onChange={(e) => {
                              e.target.style.height = "auto";
                              e.target.style.height =
                                Math.max(20, e.target.scrollHeight) + "px";
                              updateTodoItem(item.id, { text: e.target.value });
                            }}
                            className="flex-grow bg-transparent focus:outline-none line-through text-gray-500 dark:text-dark-textSecondary resize-none border-none text-sm leading-5"
                            style={{ minHeight: "20px" }}
                          />
                          {item.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-dark-textSecondary flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              <span>
                                Due:{" "}
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
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-hover dark:hover:text-gray-300"
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
        </div>

        {/* Saving Indicator */}
        {isSavingTodo && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-gray-400 dark:text-dark-textSecondary">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <MobileToggle />

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" />
      )}

      <aside
        className={`${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-50 md:z-30 h-full ${
          width ? "" : "w-80"
        } bg-white dark:bg-dark-background border-r dark:border-dark-divider py-6 px-4 flex-col transition-all duration-300 items-center flex ${className}`}
        id="goals-panel"
        style={width ? { width: `${width}px` } : undefined}
      >
        <div className="w-full flex flex-col items-center justify-between">
          <div className="flex w-full justify-between items-center mb-4">
            <h1 className="font-bold text-2xl text-gray-900 dark:text-dark-textPrimary tracking-wide transition-all duration-300">
              Goals
            </h1>

            {/* View Dropdown */}
            <div className="relative" id="view-dropdown">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-dark-textPrimary bg-gray-100 dark:bg-dark-actionHover rounded-md hover:bg-gray-200 dark:hover:bg-dark-divider transition-all duration-200 border border-gray-300 dark:border-dark-divider"
              >
                {activeTab === "list"
                  ? "List"
                  : activeTab === "text"
                  ? "Text"
                  : "To-do"}
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-dark-background border border-gray-300 dark:border-dark-divider rounded-md shadow-lg z-50">
                  <button
                    onClick={() => {
                      setActiveTab("list");
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 ${
                      activeTab === "list"
                        ? "text-gray-900 dark:text-dark-textPrimary font-medium bg-gray-50 dark:bg-dark-actionHover"
                        : "text-gray-700 dark:text-dark-textSecondary"
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("text");
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 ${
                      activeTab === "text"
                        ? "text-gray-900 dark:text-dark-textPrimary font-medium bg-gray-50 dark:bg-dark-actionHover"
                        : "text-gray-700 dark:text-dark-textSecondary"
                    }`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("todo");
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-all duration-200 rounded-b-md ${
                      activeTab === "todo"
                        ? "text-gray-900 dark:text-dark-textPrimary font-medium bg-gray-50 dark:bg-dark-actionHover"
                        : "text-gray-700 dark:text-dark-textSecondary"
                    }`}
                  >
                    To-do
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-all duration-200"
            >
              <X
                size={24}
                className="text-gray-700 dark:text-dark-textSecondary"
              />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 w-full overflow-hidden">
          {activeTab === "list"
            ? renderListTab()
            : activeTab === "text"
            ? renderTextTab()
            : renderTodoTab()}
        </div>
      </aside>

      {/* Date Picker Modal */}
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

      {/* Date & Time Picker Modal */}
      <DateTimePickerModal
        isOpen={dateTimePickerOpen}
        onClose={() => setDateTimePickerOpen(false)}
        onSave={handleSaveDueDateTime}
        currentDate={
          dateTimePickerItemId && selectedTodoId
            ? todoBulletins
                .find((t) => t.id === selectedTodoId)
                ?.data.items.find((item) => item.id === dateTimePickerItemId)
                ?.dueDate
            : undefined
        }
        currentTime={
          dateTimePickerItemId && selectedTodoId
            ? todoBulletins
                .find((t) => t.id === selectedTodoId)
                ?.data.items.find((item) => item.id === dateTimePickerItemId)
                ?.dueTime
            : undefined
        }
      />
    </>
  );
}
