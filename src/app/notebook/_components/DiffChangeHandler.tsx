import { useMemo, useState, useEffect } from "react";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  XCircle,
} from "lucide-react";
import { ChangeMap } from "./utils";

export function DiffChangeHandler({
  changes,
  applyChange,
  rejectChange,
  appendChange,
  acceptAllChanges,
  rejectAllChanges,
  setActiveHighlight,
  isStreaming = false,
}: {
  changes: ChangeMap;
  applyChange: (original: string, replacement: string) => void;
  rejectChange: (original: string) => void;
  appendChange: (newText: string) => void;
  acceptAllChanges: () => void;
  rejectAllChanges: () => void;
  setActiveHighlight: (text: string | null) => void;
  isStreaming?: boolean;
}) {
  const changeKeys = Object.keys(changes);
  const [currentChangeIndex, setCurrentChangeIndex] = useState<number>(0);

  // Check if we're in special states
  const isPreparingChanges =
    changeKeys.length === 1 && changeKeys[0] === "!PREPARING!";
  const isParsingError =
    changeKeys.length === 1 && changeKeys[0] === "!PARSING_ERROR!";

  const currentKey = changeKeys[currentChangeIndex] ?? null;
  const totalChanges =
    isPreparingChanges || isParsingError ? 0 : changeKeys.length;

  // Reset to first change when changes update
  useEffect(() => {
    if (changeKeys.length > 0) {
      setCurrentChangeIndex(0);
    }
  }, [changeKeys.length]);

  useEffect(() => {
    setActiveHighlight(currentKey ?? null);
  }, [currentKey, setActiveHighlight]);

  const handlePrevious = () => {
    setCurrentChangeIndex((prev) => (prev > 0 ? prev - 1 : totalChanges - 1));
  };

  const handleNext = () => {
    setCurrentChangeIndex((prev) => (prev < totalChanges - 1 ? prev + 1 : 0));
  };

  const handleAccept = () => {
    if (currentKey) {
      if (currentKey === "!ADD_TO_END!") {
        appendChange(changes[currentKey]);
      } else {
        applyChange(currentKey, changes[currentKey]);
      }
      // After accepting, adjust index if needed
      if (currentChangeIndex >= changeKeys.length - 1) {
        setCurrentChangeIndex(Math.max(0, changeKeys.length - 2));
      }
    }
  };

  const handleReject = () => {
    if (currentKey) {
      rejectChange(currentKey);
      // After rejecting, adjust index if needed
      if (currentChangeIndex >= changeKeys.length - 1) {
        setCurrentChangeIndex(Math.max(0, changeKeys.length - 2));
      }
    }
  };

  const handleAcceptAll = () => {
    acceptAllChanges();
    setActiveHighlight(null);
    setCurrentChangeIndex(0);
  };

  const handleRejectAll = () => {
    rejectAllChanges();
    setActiveHighlight(null);
    setCurrentChangeIndex(0);
  };

  if (!currentKey && !isPreparingChanges && !isParsingError) return null;

  // Show preparing state
  if (isPreparingChanges) {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out">
        <div className="bg-white dark:bg-dark-paper border-2 border-gray-300 dark:border-dark-divider rounded-full shadow-xl px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">
              Preparing changes...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show parsing error state
  if (isParsingError) {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out">
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-full shadow-xl px-6 py-3 flex items-center gap-3 max-w-md">
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {changes["!PARSING_ERROR!"]}
          </span>
          <button
            onClick={handleRejectAll}
            className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 z-50 transition-all duration-300 ease-out">
      <div className="bg-white dark:bg-dark-paper border-2 border-gray-300 dark:border-dark-divider rounded-full shadow-xl px-4 py-2.5 flex items-center gap-2">
        {/* Change counter */}
        <div className="flex items-center gap-2 px-2 border-r border-gray-300 dark:border-dark-divider">
          <span className="text-xs font-semibold text-gray-700 dark:text-dark-textPrimary whitespace-nowrap">
            {currentChangeIndex + 1} / {totalChanges}
          </span>
        </div>

        {/* Navigation buttons */}
        {totalChanges > 1 && (
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-dark-divider pr-2">
            <button
              onClick={handlePrevious}
              disabled={isStreaming}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous change"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-dark-textPrimary" />
            </button>
            <button
              onClick={handleNext}
              disabled={isStreaming}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next change"
            >
              <ChevronRight className="w-4 h-4 text-gray-700 dark:text-dark-textPrimary" />
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleAccept}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors border border-green-200 dark:border-green-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Accept this change"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Accept</span>
          </button>
          <button
            onClick={handleReject}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reject this change"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reject</span>
          </button>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-1 border-l border-gray-300 dark:border-dark-divider pl-2">
          <button
            onClick={handleAcceptAll}
            disabled={isStreaming}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 dark:bg-dark-secondary text-gray-700 dark:text-dark-textPrimary text-xs font-medium rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors border border-gray-200 dark:border-dark-divider disabled:opacity-50 disabled:cursor-not-allowed"
            title="Accept all changes"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">All</span>
          </button>
          <button
            onClick={handleRejectAll}
            disabled={isStreaming}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 dark:bg-dark-secondary text-gray-700 dark:text-dark-textPrimary text-xs font-medium rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors border border-gray-200 dark:border-dark-divider disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reject all changes"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
}
