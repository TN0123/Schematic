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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b dark:border-dark-divider px-4 py-3"
    >
      {unreadReminders.length === 0 ? (
        <div className="flex items-center justify-between">
          {/* Back Arrow */}
          <button
            onClick={onToggle}
            className="flex items-center px-3 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-dark-actionHover transition-all duration-200"
          >
            <ArrowLeft
              size={16}
              className="mr-2 text-gray-600 dark:text-dark-textSecondary"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">
              Back
            </span>
          </button>
          {/* No reminders message */}
          <div className="flex-1 text-center text-gray-500 dark:text-dark-textSecondary">
            <Bell size={20} className="inline mr-2 opacity-50" />
            <span className="text-sm">No new reminders</span>
          </div>
          <div className="w-16"></div> {/* Spacer for balance */}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {/* Back Arrow */}
          <button
            onClick={onToggle}
            className="flex items-center px-3 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-dark-actionHover transition-all duration-200"
          >
            <ArrowLeft
              size={16}
              className="mr-2 text-gray-600 dark:text-dark-textSecondary"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">
              Back
            </span>
          </button>

          {/* Navigation Arrow - Left */}
          <button
            onClick={handlePrev}
            disabled={currentReminderIndex === 0}
            className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-dark-actionHover disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft
              size={20}
              className="text-gray-600 dark:text-dark-textSecondary"
            />
          </button>

          {/* Current Reminder */}
          <div className="flex-1 mx-4">
            {currentReminder && (
              <motion.div
                key={currentReminder.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <div className="flex items-center justify-center mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">
                    {formatDate(currentReminder.time)} at{" "}
                    {formatTime(currentReminder.time)}
                  </span>
                  {currentReminder.isAISuggested && (
                    <div className="ml-2 flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                      <Bot
                        size={12}
                        className="text-purple-600 dark:text-purple-400 mr-1"
                      />
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        AI
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-gray-800 dark:text-dark-textPrimary font-medium">
                  {currentReminder.text}
                </p>
                <div className="mt-2 flex items-center justify-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-dark-textSecondary">
                    {currentReminderIndex + 1} of {unreadReminders.length}
                  </span>
                  <div className="flex space-x-1">
                    {unreadReminders.map((_, index) => (
                      <div
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                          index === currentReminderIndex
                            ? "bg-blue-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Navigation Arrow - Right */}
          <button
            onClick={handleNext}
            disabled={currentReminderIndex === unreadReminders.length - 1}
            className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-dark-actionHover disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronRight
              size={20}
              className="text-gray-600 dark:text-dark-textSecondary"
            />
          </button>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="ml-2 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-all duration-200"
            title="Dismiss reminder"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
