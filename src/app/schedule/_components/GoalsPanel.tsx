import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PanelLeftOpen, PanelLeftClose, Menu, X } from "lucide-react";
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

interface GoalsPanelProps {
  onToggle?: () => void;
}

export default function GoalsPanel({ onToggle }: GoalsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [goalToAdd, setGoalToAdd] = useState<string>("");
  const [currentDuration, setCurrentDuration] = useState<GoalDuration>(
    GoalDuration.DAILY
  );
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filters, setFilters] = useState<GoalDuration[]>([]);
  const [removingGoals, setRemovingGoals] = useState<string[]>([]);
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

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
      setGoals(data);
    } catch (error) {
      console.error("Error fetching goals:", error);
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
    setGoals([...goals, newGoal]);
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

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    if (onToggle) {
      onToggle();
      setTimeout(() => onToggle(), 300);
    }
  };

  return (
    <>
      <aside
        className={`hidden md:flex fixed md:relative z-30 h-full ${
          isCollapsed ? "w-14" : "w-80"
        } bg-white dark:bg-dark-background border-r dark:border-dark-divider py-6 ${
          isCollapsed ? "px-2" : "px-4"
        } flex-col transition-all duration-300 items-center`}
        id="goals-panel"
      >
        <div className="w-full flex flex-col items-center justify-between">
          <div className="flex w-full justify-between">
            {!isCollapsed && (
              <h1 className="font-bold text-2xl w-full text-gray-900 dark:text-dark-textPrimary tracking-wide transition-all duration-300">
                Goals
              </h1>
            )}

            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-all duration-200"
            >
              <X
                size={24}
                className="text-gray-700 dark:text-dark-textSecondary"
              />
            </button>

            <button
              onClick={handleToggle}
              className="p-2 hidden md:block rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-all duration-200"
            >
              {isCollapsed ? (
                <PanelLeftOpen
                  size={24}
                  className="text-gray-700 dark:text-dark-textSecondary"
                />
              ) : (
                <PanelLeftClose
                  size={24}
                  className="text-gray-700 dark:text-dark-textSecondary"
                />
              )}
            </button>
          </div>
          {!isCollapsed && (
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
                  {duration.charAt(0).toUpperCase() +
                    duration.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <>
            <div className="flex flex-col gap-4 py-4 overflow-y-auto h-3/4 w-full">
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
                  setCurrentDuration(
                    e.target.value.toUpperCase() as GoalDuration
                  );
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
          </>
        )}
      </aside>
    </>
  );
}
