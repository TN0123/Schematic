"use client";

import { useState, useEffect } from "react";
import { TransitionLink } from "@/components/utils/TransitionLink";
import { Calendar, TrendingUp, Circle, CheckCircle, Clock } from "lucide-react";
import DashboardEvents from "./DashboardEvents";
import {
  formatDueDate,
  sortTodoItemsByDueDate,
} from "@/app/bulletin/_components/utils/dateHelpers";

type ActiveTab = "list" | "text" | "todo";

interface Goal {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
}

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  dueDate?: string;
}

interface TodoBulletin {
  id: string;
  title: string;
  data: { items: TodoItem[] };
  updatedAt: Date;
}

interface ScheduleSectionProps {
  userId: string;
  initialGoals: Goal[];
  initialTotalGoalsCount: number;
}

export default function ScheduleSection({
  userId,
  initialGoals,
  initialTotalGoalsCount,
}: ScheduleSectionProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("todo");
  const [isMounted, setIsMounted] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [totalGoalsCount, setTotalGoalsCount] = useState(
    initialTotalGoalsCount
  );
  const [goalText, setGoalText] = useState<string>("");
  const [todoBulletins, setTodoBulletins] = useState<TodoBulletin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved active tab from localStorage after mount
  useEffect(() => {
    setIsMounted(true);
    const savedTab = localStorage.getItem(
      "goals-panel-active-tab"
    ) as ActiveTab;
    if (
      savedTab &&
      (savedTab === "list" || savedTab === "text" || savedTab === "todo")
    ) {
      setActiveTab(savedTab);
    }
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (!isMounted) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === "list") {
          // Refresh goals data
          const response = await fetch("/api/goals");
          if (response.ok) {
            const data = await response.json();
            setGoals(data);
            setTotalGoalsCount(data.length);
          }
        } else if (activeTab === "text") {
          // Fetch goal text
          const response = await fetch("/api/user/goal-text");
          if (response.ok) {
            const data = await response.json();
            setGoalText(data.goalText || "");
          }
        } else if (activeTab === "todo") {
          // Fetch todo bulletins
          const response = await fetch("/api/bulletins");
          if (response.ok) {
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
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isMounted]);

  const getGoalTypeLetter = (type: string) => {
    switch (type) {
      case "DAILY":
        return "D";
      case "WEEKLY":
        return "W";
      case "MONTHLY":
        return "M";
      case "YEARLY":
        return "Y";
      default:
        return "?";
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case "DAILY":
        return "text-green-600 dark:text-green-400";
      case "WEEKLY":
        return "text-blue-600 dark:text-blue-400";
      case "MONTHLY":
        return "text-yellow-600 dark:text-yellow-400";
      case "YEARLY":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-gray-600 dark:text-dark-textSecondary";
    }
  };

  const renderListView = () => {
    if (isLoading) {
      return (
        <div className="text-gray-500 dark:text-dark-textSecondary text-sm py-4 text-center">
          Loading...
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
            Goals
          </h3>
        </div>
        <div className="space-y-1">
          {goals.length > 0 ? (
            <>
              {goals.slice(0, 3).map((goal, index) => (
                <div
                  key={`${goal.title}-${index}`}
                  className="flex items-center py-1"
                >
                  <div className="mr-3 flex-shrink-0">
                    <span
                      className={`text-sm font-bold ${getGoalTypeColor(
                        goal.type
                      )}`}
                    >
                      {getGoalTypeLetter(goal.type)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-dark-textPrimary text-sm">
                      {goal.title}
                    </p>
                  </div>
                </div>
              ))}
              {totalGoalsCount > 3 && (
                <TransitionLink
                  href="/schedule"
                  className="flex items-center text-blue-600 dark:text-blue-400 text-sm pt-1 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {totalGoalsCount - 3} more
                </TransitionLink>
              )}
            </>
          ) : (
            <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-1">
              No goals set yet
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderTextView = () => {
    if (isLoading) {
      return (
        <div className="text-gray-500 dark:text-dark-textSecondary text-sm py-4 text-center">
          Loading...
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
            Goals
          </h3>
        </div>
        {goalText ? (
          <div className="text-sm text-gray-700 dark:text-dark-textSecondary max-h-40 overflow-y-auto">
            <p className="whitespace-pre-wrap line-clamp-6">{goalText}</p>
            {goalText.length > 200 && (
              <TransitionLink
                href="/schedule"
                className="flex items-center text-blue-600 dark:text-blue-400 text-sm pt-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
              >
                View full text →
              </TransitionLink>
            )}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-1">
            No goal text set yet
          </p>
        )}
      </div>
    );
  };

  const renderTodoView = () => {
    if (isLoading) {
      return (
        <div className="text-gray-500 dark:text-dark-textSecondary text-sm py-4 text-center">
          Loading...
        </div>
      );
    }

    if (todoBulletins.length === 0) {
      return (
        <div>
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
              To-do
            </h3>
          </div>
          <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-1">
            No to-do lists found
          </p>
        </div>
      );
    }

    // Get the most recent todo bulletin
    const recentTodo = todoBulletins[0];
    const today = new Date().toISOString().split("T")[0];

    // Filter for today's tasks
    const todayItems = recentTodo.data.items.filter(
      (item) => item.dueDate === today
    );
    const todayUnchecked = todayItems.filter((item) => !item.checked);
    const todayChecked = todayItems.filter((item) => item.checked);

    // If no today items, show upcoming tasks
    const displayItems =
      todayUnchecked.length > 0
        ? todayUnchecked
        : sortTodoItemsByDueDate(
            recentTodo.data.items.filter((item) => !item.checked)
          ).slice(0, 3);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
            {todayUnchecked.length > 0 ? "Today's Tasks" : "Upcoming Tasks"}
          </h3>
          {todayItems.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-dark-textSecondary">
              {todayChecked.length}/{todayItems.length}
            </span>
          )}
        </div>

        {displayItems.length > 0 ? (
          <div className="space-y-2">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 py-1 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`${
                      item.checked
                        ? "line-through text-gray-400 dark:text-dark-textSecondary"
                        : "text-gray-700 dark:text-dark-textSecondary"
                    } break-words`}
                  >
                    {item.text || "Untitled task"}
                  </p>
                  {item.dueDate && item.dueDate !== today && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-dark-textSecondary mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDueDate(item.dueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <TransitionLink
              href="/schedule"
              className="flex items-center text-blue-600 dark:text-blue-400 text-sm pt-1 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
            >
              Go to Schedule →
            </TransitionLink>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-1">
            No tasks for today
          </p>
        )}
      </div>
    );
  };

  return (
    <section>
      <div className="mb-4">
        <TransitionLink
          href="/schedule"
          className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
        >
          <Calendar className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
          Schedule
        </TransitionLink>
      </div>

      <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-6 space-y-8">
        {/* Today's Schedule Subsection */}
        <DashboardEvents userId={userId} />

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-dark-divider" />

        {/* Dynamic Goals/Todo Section based on selected view */}
        {!isMounted
          ? // Render initial view while mounting to prevent hydration issues
            renderListView()
          : activeTab === "list"
          ? renderListView()
          : activeTab === "text"
          ? renderTextView()
          : renderTodoView()}
      </div>
    </section>
  );
}
