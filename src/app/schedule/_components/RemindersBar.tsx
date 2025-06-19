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
      initial={{ opacity: 0, y: -64, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -32, scale: 0.98 }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0.0, 0.2, 1],
      }}
      className="w-full z-20 flex items-center bg-gray-50/95 dark:bg-dark-background/95 backdrop-blur-sm px-6 h-16 shadow-lg shadow-black/5 dark:shadow-black/20"
    >
      {unreadReminders.length === 0 ? (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center justify-start min-w-[120px]">
            <button
              onClick={onToggle}
              className="group flex items-center px-4 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <ArrowLeft
                size={18}
                className="mr-2 text-gray-600 dark:text-dark-textSecondary group-hover:text-gray-800 dark:group-hover:text-dark-textPrimary transition-colors duration-200"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-dark-textPrimary group-hover:text-gray-900 dark:group-hover:text-white">
                Back
              </span>
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex-1 text-center text-gray-500 dark:text-dark-textSecondary"
          >
            <div className="flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Bell size={22} className="mr-3 opacity-60" />
              </motion.div>
              <span className="text-sm font-medium">No new reminders</span>
            </div>
          </motion.div>
          <div className="flex items-center justify-end min-w-[120px]"></div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center justify-start min-w-[120px]">
            <button
              onClick={onToggle}
              className="group flex items-center px-4 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <ArrowLeft
                size={18}
                className="mr-2 text-gray-600 dark:text-dark-textSecondary group-hover:text-gray-800 dark:group-hover:text-dark-textPrimary transition-colors duration-200"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-dark-textPrimary group-hover:text-gray-900 dark:group-hover:text-white">
                Back
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center flex-1 max-w-2xl mx-4">
            <button
              onClick={handlePrev}
              disabled={currentReminderIndex === 0}
              className="group p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <ChevronLeft
                size={18}
                className="text-gray-600 dark:text-dark-textSecondary group-hover:text-gray-800 dark:group-hover:text-dark-textPrimary transition-colors duration-200"
              />
            </button>

            <div className="flex-1 mx-4 min-w-0">
              <AnimatePresence mode="wait">
                {currentReminder && (
                  <motion.div
                    key={currentReminder.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{
                      duration: 0.3,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-xs font-semibold text-gray-600 dark:text-dark-textSecondary truncate bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                        {formatDate(currentReminder.time)} at{" "}
                        {formatTime(currentReminder.time)}
                      </span>
                      {currentReminder.isAISuggested && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.1,
                            type: "spring",
                            stiffness: 200,
                          }}
                          className="ml-2 flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full shadow-sm"
                        >
                          <Bot
                            size={12}
                            className="text-blue-600 dark:text-blue-400 mr-1"
                          />
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                            AI
                          </span>
                        </motion.div>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-dark-textPrimary font-medium truncate px-2">
                      {currentReminder.text}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleNext}
              disabled={currentReminderIndex === unreadReminders.length - 1}
              className="group p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <ChevronRight
                size={18}
                className="text-gray-600 dark:text-dark-textSecondary group-hover:text-gray-800 dark:group-hover:text-dark-textPrimary transition-colors duration-200"
              />
            </button>
          </div>

          <div className="flex items-center justify-end min-w-[120px] space-x-2">
            <motion.span
              key={`${currentReminderIndex + 1}/${unreadReminders.length}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-semibold text-gray-500 dark:text-dark-textSecondary bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md"
            >
              {currentReminderIndex + 1}/{unreadReminders.length}
            </motion.span>
            <button
              onClick={handleDismiss}
              className="group p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-all duration-300 hover:scale-110 active:scale-95"
              title="Dismiss reminder"
            >
              <X
                size={16}
                className="group-hover:rotate-90 transition-transform duration-200"
              />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
