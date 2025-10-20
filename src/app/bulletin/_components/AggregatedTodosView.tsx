"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle,
  Circle,
  ClipboardList,
  SquareCheckBig,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  formatDueDate,
  getDueDateStatus,
  sortTodoItemsByDueDate,
} from "./utils/dateHelpers";
import { getTodayInTimezone, getTomorrowInTimezone } from "@/lib/timezone";

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  dueDate?: string;
  noteTitle: string;
  noteId: string;
}

interface AggregatedTodosViewProps {
  items: Array<{
    id: string;
    title: string;
    type: string;
    data?: any;
  }>;
  onNavigateToNote: (noteId: string) => void;
}

export default function AggregatedTodosView({
  items,
  onNavigateToNote,
}: AggregatedTodosViewProps) {
  const [filter, setFilter] = useState<
    "all" | "today" | "upcoming" | "completed"
  >("all");

  // Aggregate all todos from all todo-type bulletins
  const allTodos = useMemo(() => {
    const todos: TodoItem[] = [];
    items.forEach((item) => {
      if (
        item.type === "todo" &&
        item.data?.items &&
        Array.isArray(item.data.items)
      ) {
        item.data.items.forEach((todoItem: any) => {
          // Only process items that have the todo structure
          if (
            todoItem &&
            typeof todoItem.text === "string" &&
            typeof todoItem.checked === "boolean"
          ) {
            todos.push({
              id: todoItem.id,
              text: todoItem.text,
              checked: todoItem.checked,
              dueDate: todoItem.dueDate,
              noteTitle: item.title || "Untitled",
              noteId: item.id,
            });
          }
        });
      }
    });
    return todos;
  }, [items]);

  // Filter and categorize todos
  const today = getTodayInTimezone();

  const filteredTodos = useMemo(() => {
    let filtered = allTodos;

    switch (filter) {
      case "today":
        filtered = allTodos.filter(
          (todo) => todo.dueDate === today && !todo.checked
        );
        break;
      case "upcoming":
        filtered = allTodos.filter((todo) => {
          if (!todo.dueDate || todo.checked) return false;
          return todo.dueDate > today;
        });
        break;
      case "completed":
        filtered = allTodos.filter((todo) => todo.checked);
        break;
      case "all":
      default:
        filtered = allTodos.filter((todo) => !todo.checked);
        break;
    }

    return sortTodoItemsByDueDate(filtered);
  }, [allTodos, filter, today]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = allTodos.length;
    const completed = allTodos.filter((t) => t.checked).length;
    const todayTodos = allTodos.filter(
      (t) => t.dueDate === today && !t.checked
    ).length;
    const overdue = allTodos.filter((t) => {
      if (!t.dueDate || t.checked) return false;
      return t.dueDate < today;
    }).length;

    return { total, completed, todayTodos, overdue, active: total - completed };
  }, [allTodos, today]);

  // Group todos by due date
  const groupedTodos = useMemo(() => {
    const groups: Record<string, TodoItem[]> = {};

    filteredTodos.forEach((todo) => {
      const key = todo.dueDate || "no-date";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(todo);
    });

    return groups;
  }, [filteredTodos]);

  const dateKeys = Object.keys(groupedTodos).sort((a, b) => {
    if (a === "no-date") return 1;
    if (b === "no-date") return 1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const getDueDateLabel = (dateKey: string) => {
    if (dateKey === "no-date") return "No Due Date";

    const date = new Date(dateKey);
    const today = getTodayInTimezone();
    const tomorrowString = getTomorrowInTimezone();

    if (dateKey === today) return "Today";
    if (dateKey === tomorrowString) return "Tomorrow";
    if (dateKey < today) return `Overdue • ${formatDueDate(dateKey)}`;

    return formatDueDate(dateKey);
  };

  const getDueDateGroupColor = (dateKey: string) => {
    if (dateKey === "no-date") return "text-gray-500 dark:text-gray-400";

    const today = getTodayInTimezone();
    const tomorrowString = getTomorrowInTimezone();

    if (dateKey < today) return "text-red-600 dark:text-red-400";
    if (dateKey === today) return "text-green-600 dark:text-green-400";
    if (dateKey === tomorrowString) return "text-blue-600 dark:text-blue-400";

    return "text-purple-600 dark:text-purple-400";
  };

  if (allTodos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-background dark:to-dark-secondary">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 flex items-center justify-center shadow-lg">
            <ClipboardList className="h-12 w-12 text-green-500 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-textPrimary mb-3">
              No todos yet
            </h3>
            <p className="text-gray-600 dark:text-dark-textSecondary text-base leading-relaxed">
              Create a to-do list to see all your tasks here in one organized
              place
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-background dark:to-dark-secondary overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-textPrimary tracking-tight">
              Bulletin
            </h1>
          </div>

          {/* Progress Bar */}
          {stats.total > 0 && (
            <div className="mb-5 max-w-xl mx-auto">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span className="text-green-600 dark:text-green-400">
                  {Math.round((stats.completed / stats.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-secondary rounded-full h-2 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-sm"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(stats.completed / stats.total) * 100}%`,
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
            {[
              { key: "all", label: "All Active" },
              { key: "today", label: "Today" },
              { key: "upcoming", label: "Upcoming" },
              { key: "completed", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ease-out whitespace-nowrap ${
                  filter === tab.key
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                    : "bg-white dark:bg-dark-secondary text-gray-700 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-divider shadow-sm hover:shadow-md"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Todos List */}
        {filteredTodos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-secondary dark:to-dark-hover flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle className="h-10 w-10 text-gray-400 dark:text-dark-textSecondary" />
            </div>
            <p className="text-gray-600 dark:text-dark-textSecondary text-lg font-medium">
              {filter === "completed"
                ? "No completed tasks yet"
                : filter === "today"
                ? "No tasks due today"
                : filter === "upcoming"
                ? "No upcoming tasks"
                : "No active tasks"}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {dateKeys.map((dateKey) => {
              const todosInGroup = groupedTodos[dateKey];

              return (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className={`p-2 rounded-xl ${
                        dateKey !== "no-date" && dateKey < today
                          ? "bg-red-50 dark:bg-red-900/20"
                          : dateKey === today
                          ? "bg-green-50 dark:bg-green-900/20"
                          : dateKey ===
                            new Date(Date.now() + 86400000)
                              .toISOString()
                              .split("T")[0]
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "bg-purple-50 dark:bg-purple-900/20"
                      }`}
                    >
                      <SquareCheckBig
                        className={`h-5 w-5 ${getDueDateGroupColor(dateKey)}`}
                      />
                    </div>
                    <h2
                      className={`text-xl font-bold ${getDueDateGroupColor(
                        dateKey
                      )}`}
                    >
                      {getDueDateLabel(dateKey)}
                    </h2>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-gray-300 to-transparent dark:from-dark-divider dark:to-transparent rounded-full" />
                    <span className="text-sm font-semibold text-gray-500 dark:text-dark-textSecondary bg-gray-100 dark:bg-dark-secondary px-3 py-1 rounded-full">
                      {todosInGroup.length}
                    </span>
                  </div>

                  {/* Todos */}
                  <div className="space-y-3">
                    {todosInGroup.map((todo) => (
                      <motion.div
                        key={`${todo.noteId}-${todo.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -4 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        }}
                        className={`group bg-white dark:bg-dark-secondary rounded-2xl p-5 border-2 ${
                          todo.checked
                            ? "border-gray-200 dark:border-dark-divider opacity-70"
                            : "border-gray-200 dark:border-dark-divider hover:border-green-300 dark:hover:border-green-700"
                        } shadow-sm hover:shadow-xl transition-all duration-300 ease-out cursor-pointer`}
                        onClick={() => onNavigateToNote(todo.noteId)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="pt-1">
                            {todo.checked ? (
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center transition-all duration-300">
                                <CheckCircle className="w-5 h-5 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-green-500 dark:group-hover:border-green-500 transition-all duration-300 ease-out flex items-center justify-center">
                                <Circle className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors duration-300 ease-out" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-base leading-relaxed font-medium ${
                                todo.checked
                                  ? "line-through text-gray-500 dark:text-gray-400"
                                  : "text-gray-900 dark:text-dark-textPrimary"
                              }`}
                            >
                              {todo.text || "Untitled task"}
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <span className="text-xs font-medium text-gray-500 dark:text-dark-textSecondary flex items-center gap-1.5 bg-gray-50 dark:bg-dark-hover px-2.5 py-1 rounded-lg">
                                <ClipboardList className="w-3.5 h-3.5" />
                                {todo.noteTitle}
                              </span>
                              {todo.dueDate && (
                                <span
                                  className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                                    getDueDateStatus(todo.dueDate) === "overdue"
                                      ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                                      : getDueDateStatus(todo.dueDate) ===
                                        "today"
                                      ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                                      : "text-gray-600 dark:text-dark-textSecondary bg-gray-50 dark:bg-dark-hover"
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDueDate(todo.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
