import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import GoalCard from "./GoalCard";

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

type ActiveTab = "list" | "text";

export default function GoalsPanel() {
  const [goalToAdd, setGoalToAdd] = useState<string>("");
  const [currentDuration, setCurrentDuration] = useState<GoalDuration>(
    GoalDuration.DAILY
  );
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filters, setFilters] = useState<GoalDuration[]>([]);
  const [removingGoals, setRemovingGoals] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("list");
  const [goalText, setGoalText] = useState<string>("");
  const [isLoadingGoalText, setIsLoadingGoalText] = useState<boolean>(false);
  const [isSavingGoalText, setIsSavingGoalText] = useState<boolean>(false);
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
  }, []);

  // Load saved active tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem(
      "goals-panel-active-tab"
    ) as ActiveTab;
    if (savedTab && (savedTab === "list" || savedTab === "text")) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("goals-panel-active-tab", activeTab);
  }, [activeTab]);

  // Separate useEffect for fetchGoalText that depends on session
  useEffect(() => {
    if (session?.user?.email) {
      fetchGoalText();
    }
  }, [session?.user?.email]);

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
    const wordCount = goalText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
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
        } md:translate-x-0 fixed md:relative z-50 md:z-30 h-full w-80 bg-white dark:bg-dark-background border-r dark:border-dark-divider py-6 px-4 flex-col transition-all duration-300 items-center flex`}
        id="goals-panel"
      >
        <div className="w-full flex flex-col items-center justify-between">
          <div className="flex w-full justify-between items-center mb-4">
            <h1 className="font-bold text-2xl text-gray-900 dark:text-dark-textPrimary tracking-wide transition-all duration-300">
              Goals
            </h1>

            {/* Tab Navigation */}
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("list")}
                className={`relative pb-1 text-sm font-medium transition-all duration-300 ${
                  activeTab === "list"
                    ? "text-gray-900 dark:text-dark-textPrimary"
                    : "text-gray-400 dark:text-dark-textSecondary hover:text-gray-600 dark:hover:text-dark-textPrimary"
                }`}
              >
                List
                {/* Animated underline */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-dark-textPrimary rounded-full transition-all duration-300 ${
                    activeTab === "list"
                      ? "opacity-100 scale-x-100"
                      : "opacity-0 scale-x-0"
                  }`}
                />
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`relative pb-1 text-sm font-medium transition-all duration-300 ${
                  activeTab === "text"
                    ? "text-gray-900 dark:text-dark-textPrimary"
                    : "text-gray-400 dark:text-dark-textSecondary hover:text-gray-600 dark:hover:text-dark-textPrimary"
                }`}
              >
                Text
                {/* Animated underline */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-dark-textPrimary rounded-full transition-all duration-300 ${
                    activeTab === "text"
                      ? "opacity-100 scale-x-100"
                      : "opacity-0 scale-x-0"
                  }`}
                />
              </button>
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
          {activeTab === "list" ? renderListTab() : renderTextTab()}
        </div>
      </aside>
    </>
  );
}
