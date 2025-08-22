import { useMemo, useState, useEffect } from "react";
import { Check, X, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { ChangeMap } from "./WriteEditor";

export function ChangeHandler({
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
  const [editedSuggestion, setEditedSuggestion] = useState<string>("");

  // Check if we're in special states
  const isPreparingChanges = changeKeys.length === 1 && changeKeys[0] === "!PREPARING!";
  const isParsingError = changeKeys.length === 1 && changeKeys[0] === "!PARSING_ERROR!";
  
  const currentKey = changeKeys[currentChangeIndex] ?? null;
  const totalChanges = (isPreparingChanges || isParsingError) ? 0 : changeKeys.length;

  // Reset to first change when changes update
  useEffect(() => {
    if (changeKeys.length > 0) {
      setCurrentChangeIndex(0);
    }
  }, [changeKeys.length]);

  useEffect(() => {
    setActiveHighlight(currentKey ?? null);
  }, [currentKey, setActiveHighlight]);

  // Update editedSuggestion when currentKey changes
  useEffect(() => {
    if (currentKey && changes[currentKey]) {
      setEditedSuggestion(changes[currentKey]);
    }
  }, [currentKey, changes]);

  const handlePrevious = () => {
    setCurrentChangeIndex((prev) => (prev > 0 ? prev - 1 : totalChanges - 1));
  };

  const handleNext = () => {
    setCurrentChangeIndex((prev) => (prev < totalChanges - 1 ? prev + 1 : 0));
  };

  const handleAccept = () => {
    if (currentKey) {
      if (currentKey == "!ADD_TO_END!") {
        appendChange(editedSuggestion);
      } else {
        applyChange(currentKey, editedSuggestion);
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
      <div className="w-full sticky top-24 flex flex-col p-4 border border-gray-300 dark:border-dark-divider gap-4 bg-white dark:bg-dark-paper rounded-2xl h-full transition-all duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-textPrimary">
            Changes
          </h3>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-dark-textDisabled rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 dark:text-dark-textSecondary">Preparing...</span>
          </div>
        </div>

        <div className="flex-grow overflow-hidden bg-gray-50 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-xl p-5 flex flex-col gap-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-dark-actionDisabledBackground rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-dark-actionDisabledBackground rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-dark-actionDisabledBackground rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show parsing error state  
  if (isParsingError) {
    return (
      <div className="w-full sticky top-24 flex flex-col p-4 border border-gray-300 dark:border-dark-divider gap-4 bg-white dark:bg-dark-paper rounded-2xl h-full transition-all duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-textPrimary">
            Response Received
          </h3>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <span className="text-sm text-orange-600 dark:text-orange-400">Processing Issue</span>
          </div>
        </div>

        <div className="flex-grow overflow-hidden bg-orange-50 dark:bg-dark-secondary border border-orange-200 dark:border-dark-divider rounded-xl p-5 flex flex-col items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-orange-600 dark:text-orange-400 font-medium mb-2">
              {changes["!PARSING_ERROR!"]}
            </div>
            <div className="text-sm text-orange-500 dark:text-dark-textSecondary">
              You can see the AI's response in the chat above and try rephrasing your request.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full sticky top-24 flex flex-col p-4 border border-gray-300 dark:border-dark-divider gap-4 bg-white dark:bg-dark-paper rounded-2xl h-full transition-all duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-textPrimary">
          {totalChanges} Change(s) Remaining
        </h3>
        {totalChanges > 1 && (
          <div className="text-sm text-gray-600 dark:text-dark-textSecondary">
            {currentChangeIndex + 1} of {totalChanges}
          </div>
        )}
      </div>

      <div className="flex-grow overflow-hidden bg-gray-100 dark:bg-dark-secondary border border-gray-300 dark:border-dark-divider rounded-xl p-5 flex flex-col gap-4 relative">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-dark-textSecondary font-medium">
            Suggested:
          </span>
          {totalChanges > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevious}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                title="Previous change"
              >
                <ChevronLeft
                  size={16}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
              <button
                onClick={handleNext}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                title="Next change"
              >
                <ChevronRight
                  size={16}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
            </div>
          )}
        </div>
        <textarea
          value={editedSuggestion}
          onChange={(e) => setEditedSuggestion(e.target.value)}
          className="flex-1 text-sm text-gray-900 dark:text-dark-textPrimary font-normal whitespace-pre-wrap bg-transparent border-none resize-none outline-none focus:ring-0 min-h-[100px]"
          placeholder={isStreaming ? "AI is generating content..." : "Edit the suggestion before accepting..."}
          readOnly={isStreaming}
        />
        {isStreaming && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <div className="animate-pulse">●</div>
            <span>Generating...</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handleAccept}
            disabled={isStreaming}
            className="px-1 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-sm hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors duration-200 flex items-center gap-1.5 border border-green-100 dark:border-green-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={14} className="text-green-600 dark:text-green-400" />
            Accept
          </button>
          <button
            onClick={handleReject}
            disabled={isStreaming}
            className="px-1 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200 flex items-center gap-1.5 border border-red-100 dark:border-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={14} className="text-red-600 dark:text-red-400" />
            Reject
          </button>
          <button
            onClick={handleAcceptAll}
            disabled={isStreaming}
            className="px-1 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 rounded-sm dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-gray-200 dark:border-gray-700/50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept All
          </button>
          <button
            onClick={handleRejectAll}
            disabled={isStreaming}
            className="px-1 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 rounded-sm dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-gray-200 dark:border-gray-700/50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject All
          </button>
        </div>
      </div>
    </div>
  );
}
