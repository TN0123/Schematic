import { useMemo, useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { ChangeMap } from "./WriteEditor";

export function ChangeHandler({
  changes,
  applyChange,
  rejectChange,
  appendChange,
  acceptAllChanges,
  rejectAllChanges,
  setActiveHighlight,
}: {
  changes: ChangeMap;
  applyChange: (original: string, replacement: string) => void;
  rejectChange: (original: string) => void;
  appendChange: (newText: string) => void;
  acceptAllChanges: () => void;
  rejectAllChanges: () => void;
  setActiveHighlight: (text: string | null) => void;
}) {
  const changeKeys = Object.keys(changes);
  const [currentKey, setCurrentKey] = useState<string | null>(
    changeKeys[0] ?? null
  );

  useEffect(() => {
    if (!currentKey || !changes[currentKey]) {
      setCurrentKey(changeKeys[0] ?? null);
    }
  }, [changes, currentKey]);

  useEffect(() => {
    setActiveHighlight(currentKey ?? null);
  }, [currentKey, setActiveHighlight]);

  const handleAccept = () => {
    if (currentKey) {
      if (currentKey == "!ADD_TO_END!") {
        appendChange(changes[currentKey]);
      } else {
        const replacement = changes[currentKey];
        applyChange(currentKey, replacement);
      }
    }
  };

  const handleReject = () => {
    if (currentKey) {
      rejectChange(currentKey);
    }
  };

  const handleAcceptAll = () => {
    acceptAllChanges();
    setActiveHighlight(null);
    setCurrentKey(null);
  };

  const handleRejectAll = () => {
    rejectAllChanges();
    setActiveHighlight(null);
    setCurrentKey(null);
  };

  if (!currentKey) return null;

  const totalChanges = changeKeys.length;
  const suggestion = changes[currentKey];

  return (
    <div className="w-full sticky top-24 flex flex-col p-4 border border-gray-300 dark:border-dark-divider gap-4 bg-white dark:bg-dark-paper rounded-2xl h-full transition-all duration-200">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-textPrimary text-center">
        {totalChanges} Change(s) Remaining
      </h3>

      <div className="flex-grow overflow-y-auto bg-gray-100 dark:bg-dark-secondary border border-gray-300 dark:border-dark-divider rounded-xl p-5 flex flex-col gap-4 relative">
        <span className="text-sm text-gray-600 dark:text-dark-textSecondary font-medium">
          Suggested:
        </span>
        <div className="text-sm text-gray-900 dark:text-dark-textPrimary font-normal whitespace-pre-wrap">
          {suggestion}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={handleAccept}
            className="px-1 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-sm hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors duration-200 flex items-center gap-1.5 border border-green-100 dark:border-green-800/50"
          >
            <Check size={14} className="text-green-600 dark:text-green-400" />
            Accept
          </button>
          <button
            onClick={handleReject}
            className="px-1 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200 flex items-center gap-1.5 border border-red-100 dark:border-red-800/50"
          >
            <X size={14} className="text-red-600 dark:text-red-400" />
            Reject
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-1 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 rounded-sm dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-gray-200 dark:border-gray-700/50 shadow-sm"
          >
            Accept All
          </button>
          <button
            onClick={handleRejectAll}
            className="px-1 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 rounded-sm dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-gray-200 dark:border-gray-700/50 shadow-sm"
          >
            Reject All
          </button>
        </div>
      </div>
    </div>
  );
}
