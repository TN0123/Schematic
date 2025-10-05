"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { useWriteSettings } from "@/components/WriteSettingsProvider";
import { useScheduleSettings } from "@/components/ScheduleSettingsProvider";
import { Moon, Sun, PenLine, Calendar } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const { viewMode, setViewMode } = useWriteSettings();
  const { suggestionsEnabled, setSuggestionsEnabled } = useScheduleSettings();

  return (
    <div className="flex flex-col items-center justify-start h-screen pt-24 bg-gray-50 dark:bg-dark-background transition-all overflow-y-auto">
      <div className="py-6">
        <h1 className="text-4xl text-center font-bold text-gray-900 dark:text-dark-textPrimary mb-8">
          Settings
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-dark-textSecondary mb-12">
          Manage your preferences here.
        </p>
      </div>

      <div className="w-full max-w-2xl px-4 space-y-6">
        {/* Appearance Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
              Appearance
            </h2>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-800 dark:text-dark-textPrimary">
                Theme
              </span>
              <span className="flex items-center gap-2">
                <Moon className="dark:text-dark-textSecondary w-4 h-4" />
                <ThemeToggle />
                <Sun className="text-yellow-600 dark:text-yellow-400 w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule
            </h2>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-800 dark:text-dark-textPrimary font-medium block mb-1">
                  AI Event Suggestions
                </span>
                <span className="text-xs text-gray-600 dark:text-dark-textSecondary">
                  Automatically suggest events based on your schedule
                </span>
              </div>
              <button
                onClick={() => setSuggestionsEnabled(!suggestionsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  suggestionsEnabled
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-dark-divider"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    suggestionsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Write Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              Write
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-800 dark:text-dark-textPrimary mb-3 block">
                Suggestion Display Mode
              </label>
              <p className="text-xs text-gray-600 dark:text-dark-textSecondary mb-3">
                Choose how AI suggestions are displayed in the editor
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode("changeHandler")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    viewMode === "changeHandler"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-paper hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-dark-textPrimary mb-1">
                      Change Handler
                    </div>
                    <div className="text-xs text-gray-600 dark:text-dark-textSecondary">
                      View suggestions in a separate panel with highlighted
                      original text
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode("diff")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    viewMode === "diff"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-paper hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-dark-textPrimary mb-1">
                      Diff View
                    </div>
                    <div className="text-xs text-gray-600 dark:text-dark-textSecondary">
                      Show inline diffs with old text vs new text
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="px-6 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
