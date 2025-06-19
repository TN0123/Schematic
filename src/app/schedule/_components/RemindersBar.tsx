"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Bell,
  Bot,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Reminder {
  id: string;
  text: string;
  time: Date;
  isAISuggested: boolean;
  isRead?: boolean;
}

interface RemindersBarProps {
  isVisible: boolean;
  onToggle: () => void;
  reminders: Reminder[];
  onDismissReminder: (id: string) => void;
}

export default function RemindersBar({
  isVisible,
  onToggle,
  reminders,
  onDismissReminder,
}: RemindersBarProps) {
  const [currentReminderIndex, setCurrentReminderIndex] = useState(0);

  const unreadReminders = reminders.filter((r) => !r.isRead);
  const currentReminder = unreadReminders[currentReminderIndex];

  const handleNext = () => {
    if (currentReminderIndex < unreadReminders.length - 1) {
      setCurrentReminderIndex(currentReminderIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentReminderIndex > 0) {
      setCurrentReminderIndex(currentReminderIndex - 1);
    }
  };

  const handleDismiss = () => {
    if (currentReminder) {
      onDismissReminder(currentReminder.id);
      // Reset index if we're at the end
      if (currentReminderIndex >= unreadReminders.length - 1) {
        setCurrentReminderIndex(Math.max(0, unreadReminders.length - 2));
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-100%" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="absolute top-0 left-0 w-full z-10 flex items-center bg-gray-50 dark:bg-dark-background border-b border-gray-200 dark:border-dark-divider px-4 h-14"
    >
      {unreadReminders.length === 0 ? (
        <div className="flex items-center justify-between w-full">
          <div
            className="flex items-center justify-start"
            style={{ minWidth: "80px" }}
          >
            <button
              onClick={onToggle}
              className="flex items-center px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft
                size={16}
                className="mr-2 text-gray-600 dark:text-dark-textSecondary"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">
                Back
              </span>
            </button>
          </div>
          <div className="flex-1 text-center text-gray-500 dark:text-dark-textSecondary">
            <Bell size={20} className="inline mr-2 opacity-50" />
            <span className="text-sm">No new reminders</span>
          </div>
          <div
            className="flex items-center justify-end"
            style={{ minWidth: "100px" }}
          ></div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div
            className="flex items-center justify-start"
            style={{ minWidth: "80px" }}
          >
            <button
              onClick={onToggle}
              className="flex items-center px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft
                size={16}
                className="mr-2 text-gray-600 dark:text-dark-textSecondary"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">
                Back
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center flex-1">
            <button
              onClick={handlePrev}
              disabled={currentReminderIndex === 0}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft
                size={16}
                className="text-gray-600 dark:text-dark-textSecondary"
              />
            </button>

            <div className="flex-1 mx-2 min-w-0">
              {currentReminder && (
                <motion.div
                  key={currentReminder.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center mb-0.5">
                    <span className="text-xs font-medium text-gray-600 dark:text-dark-textSecondary truncate">
                      {formatDate(currentReminder.time)} at{" "}
                      {formatTime(currentReminder.time)}
                    </span>
                    {currentReminder.isAISuggested && (
                      <div className="ml-2 flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <Bot
                          size={12}
                          className="text-blue-600 dark:text-blue-400 mr-1"
                        />
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          AI
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 dark:text-dark-textPrimary font-medium truncate">
                    {currentReminder.text}
                  </p>
                </motion.div>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={currentReminderIndex === unreadReminders.length - 1}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight
                size={16}
                className="text-gray-600 dark:text-dark-textSecondary"
              />
            </button>
          </div>

          <div
            className="flex items-center justify-end"
            style={{ minWidth: "80px" }}
          >
            <span className="text-xs font-medium text-gray-500 dark:text-dark-textSecondary mr-2">
              {currentReminderIndex + 1}/{unreadReminders.length}
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-all duration-200"
              title="Dismiss reminder"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
