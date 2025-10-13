"use client";

import { Check, X, Clock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { HabitType } from "@prisma/client";

export interface HabitSuggestion {
  id: string;
  title: string;
  start: Date;
  end: Date;
  habitType: HabitType;
  confidence: number;
  isHabitBased?: boolean;
}

interface HabitSuggestionsPanelProps {
  suggestions: HabitSuggestion[];
  onAccept: (suggestion: HabitSuggestion) => Promise<void>;
  onReject: (suggestionId: string) => Promise<void>;
  timezone: string;
}

export default function HabitSuggestionsPanel({
  suggestions,
  onAccept,
  onReject,
  timezone,
}: HabitSuggestionsPanelProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (suggestion: HabitSuggestion) => {
    setProcessingIds((prev) => new Set(prev).add(suggestion.id));
    try {
      await onAccept(suggestion);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const handleReject = async (suggestionId: string) => {
    setProcessingIds((prev) => new Set(prev).add(suggestionId));
    try {
      await onReject(suggestionId);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    }).format(date);
  };

  const getHabitColor = (habitType: HabitType) => {
    const colors = {
      [HabitType.MEAL]:
        "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300",
      [HabitType.WORKOUT]:
        "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300",
      [HabitType.MEETING]:
        "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
      [HabitType.COMMUTE]:
        "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
      [HabitType.WORK_BLOCK]:
        "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300",
      [HabitType.PERSONAL]:
        "bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300",
    };
    return (
      colors[habitType] ||
      "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300"
    );
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-blue-500 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-textPrimary">
          Habit-Based Suggestions
        </h3>
      </div>

      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion) => {
          const isProcessing = processingIds.has(suggestion.id);
          const confidencePercent = Math.round(suggestion.confidence * 100);

          return (
            <motion.div
              key={suggestion.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2 }}
              className="mb-3 last:mb-0"
            >
              <div className="bg-gray-50 dark:bg-dark-background border border-gray-200 dark:border-dark-divider rounded-lg p-3">
                {/* Header with confidence badge */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-dark-textPrimary mb-1">
                      {suggestion.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-textSecondary">
                      <Clock size={12} />
                      <span>
                        {formatTime(suggestion.start)} -{" "}
                        {formatTime(suggestion.end)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getHabitColor(
                      suggestion.habitType
                    )}`}
                  >
                    {suggestion.habitType.toLowerCase().replace("_", " ")}
                  </div>
                </div>

                {/* Confidence indicator */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-dark-textSecondary">
                      Based on your habits
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-dark-textPrimary">
                      {confidencePercent}% confidence
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-divider rounded-full h-1.5">
                    <div
                      className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(suggestion)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(suggestion.id)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-actionDisabledBackground dark:hover:bg-dark-actionHover text-gray-700 dark:text-dark-textPrimary text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X size={16} />
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
