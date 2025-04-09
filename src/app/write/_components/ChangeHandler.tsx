import { useMemo, useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { ChangeMap } from "./WriteEditor";

export function ChangeHandler({
  changes,
  applyChange,
  rejectChange,
  acceptAllChanges,
  setActiveHighlight,
}: {
  changes: ChangeMap;
  applyChange: (original: string, replacement: string) => void;
  rejectChange: (original: string) => void;
  acceptAllChanges: () => void;
  setActiveHighlight: (text: string | null) => void;
}) {
  const changeKeys = Object.keys(changes);
  const [currentKey, setCurrentKey] = useState<string | null>(
    changeKeys[0] ?? null
  );

  // Sync currentKey with latest change keys
  useEffect(() => {
    if (!currentKey || !changes[currentKey]) {
      setCurrentKey(changeKeys[0] ?? null);
    }
  }, [changes, currentKey]);

  // Highlight update
  useEffect(() => {
    setActiveHighlight(currentKey ?? null);
  }, [currentKey, setActiveHighlight]);

  const handleAccept = () => {
    if (currentKey) {
      const replacement = changes[currentKey];
      applyChange(currentKey, replacement);
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
    <div className="w-full h-full flex flex-col p-4 border gap-1 bg-white rounded-xl">
      <div className="flex flex-col justify-between items-center py-2 gap-2 border-b border-gray-200 mb-4">
        <h3 className="text-md font-semibold text-center text-gray-700">
          {totalChanges} change(s) remaining
        </h3>
      </div>

      <div className="h-3/4 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
        <div>
          <span className="text-sm text-gray-500">Suggestion:</span>
          <div className="text-green-700 font-medium whitespace-pre-wrap">
            {suggestion}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleAccept}
          className="text-sm text-green-700 font-semibold hover:underline inline-flex items-center gap-1"
        >
          <Check size={16} /> Accept
        </button>
        <button
          onClick={handleReject}
          className="text-sm text-red-600 font-semibold hover:underline inline-flex items-center gap-1"
        >
          <X size={16} /> Reject
        </button>
      </div>
      <button
        onClick={handleAcceptAll}
        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition"
      >
        Accept All
      </button>
    </div>
  );
}
