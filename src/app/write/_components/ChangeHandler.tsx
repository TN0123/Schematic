import { useMemo, useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { ChangeMap } from "./WriteEditor";

export function ChangeHandler({
  changes,
  applyChange,
  rejectChange,
  appendChange,
  acceptAllChanges,
  setActiveHighlight,
}: {
  changes: ChangeMap;
  applyChange: (original: string, replacement: string) => void;
  rejectChange: (original: string) => void;
  appendChange: (newText: string) => void;
  acceptAllChanges: () => void;
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

  if (!currentKey) return null;

  const totalChanges = changeKeys.length;
  const suggestion = changes[currentKey];

  return (
    <div className="w-full sticky top-24 flex flex-col p-4 border border-gray-300 dark:border-dark-divider gap-4 bg-white dark:bg-dark-paper rounded-2xl h-full transition-all duration-200">
      <div className="flex flex-col justify-center items-center py-3 gap-2 border-b border-gray-300 dark:border-dark-divider mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-textPrimary text-center">
          {totalChanges} Change(s) Remaining
        </h3>
      </div>

      <div className="flex-grow overflow-y-auto bg-gray-100 dark:bg-dark-secondary border border-gray-300 dark:border-dark-divider rounded-xl p-5 flex flex-col gap-4">
        <div>
          <span className="text-sm text-gray-600 dark:text-dark-textSecondary font-medium">
            Suggested:
          </span>
          <div className="text-sm text-gray-900 dark:text-dark-textPrimary font-normal whitespace-pre-wrap mt-2">
            {suggestion}
          </div>
        </div>
      </div>

      <div className="flex w-full justify-between gap-4">
        <button
          onClick={handleAccept}
          className="w-1/2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-xl text-sm hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-200 flex items-center justify-center gap-2 border border-green-200 dark:border-green-700 shadow-sm"
        >
          <Check size={16} className="text-green-700 dark:text-green-300" />{" "}
          Accept
        </button>
        <button
          onClick={handleReject}
          className="w-1/2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-2 rounded-xl text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 flex items-center justify-center gap-2 border border-red-200 dark:border-red-700 shadow-sm"
        >
          <X size={16} className="text-red-700 dark:text-red-300" /> Reject
        </button>
      </div>

      <button
        onClick={handleAcceptAll}
        className="w-full mt-4 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-4 py-2 rounded-xl text-sm hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200 border border-indigo-200 dark:border-indigo-700 shadow-sm"
      >
        Accept All
      </button>
    </div>
  );
}
