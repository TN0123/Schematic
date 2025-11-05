"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  X as XIcon,
} from "lucide-react";

interface SyncConflict {
  id: string;
  localEvent: {
    id: string;
    title: string;
    start: string;
    end: string;
  };
  googleEvent: {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
  };
  conflictType: "title" | "time" | "both";
  description: string;
}

interface SyncConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: SyncConflict[];
  onResolve: (
    decisions: Array<{
      eventId: string;
      action: "useLocal" | "useGoogle" | "skip";
    }>
  ) => void;
  loading?: boolean;
}

export default function SyncConflictModal({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  loading = false,
}: SyncConflictModalProps) {
  const [decisions, setDecisions] = useState<
    Record<string, "useLocal" | "useGoogle" | "skip">
  >({});
  const [bulkAction, setBulkAction] = useState<
    "none" | "useLocal" | "useGoogle" | "skip"
  >("none");

  if (!isOpen) return null;

  const handleDecisionChange = (
    conflictId: string,
    action: "useLocal" | "useGoogle" | "skip"
  ) => {
    setDecisions((prev) => ({ ...prev, [conflictId]: action }));
  };

  const handleBulkAction = (action: "useLocal" | "useGoogle" | "skip") => {
    setBulkAction(action);
    const newDecisions: Record<string, "useLocal" | "useGoogle" | "skip"> = {};
    conflicts.forEach((conflict) => {
      newDecisions[conflict.id] = action;
    });
    setDecisions(newDecisions);
  };

  const handleApply = () => {
    const decisionArray = conflicts.map((conflict) => ({
      eventId: conflict.id,
      action: decisions[conflict.id] || "skip",
    }));
    onResolve(decisionArray);
  };

  const formatDateTime = (
    dateTime: string | undefined,
    date: string | undefined
  ) => {
    if (dateTime) {
      return new Date(dateTime).toLocaleString();
    } else if (date) {
      return new Date(date).toLocaleDateString() + " (All day)";
    }
    return "No date";
  };

  const getConflictIcon = (type: "title" | "time" | "both") => {
    switch (type) {
      case "title":
        return <XIcon className="w-4 h-4 text-orange-500" />;
      case "time":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "both":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getConflictColor = (type: "title" | "time" | "both") => {
    switch (type) {
      case "title":
        return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20";
      case "time":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20";
      case "both":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-dark-divider">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                Resolve Sync Conflicts
              </h2>
              <p className="text-sm text-gray-600 dark:text-dark-textSecondary">
                {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}{" "}
                found between your local events and Google Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="p-4 border-b dark:border-dark-divider bg-gray-50 dark:bg-dark-secondary">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
              Bulk Actions:
            </span>
            <button
              onClick={() => handleBulkAction("useLocal")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                bulkAction === "useLocal"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-dark-hover text-gray-700 dark:text-dark-textSecondary hover:bg-gray-300 dark:hover:bg-dark-divider"
              }`}
            >
              Keep All Local
            </button>
            <button
              onClick={() => handleBulkAction("useGoogle")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                bulkAction === "useGoogle"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-dark-hover text-gray-700 dark:text-dark-textSecondary hover:bg-gray-300 dark:hover:bg-dark-divider"
              }`}
            >
              Keep All Google
            </button>
            <button
              onClick={() => handleBulkAction("skip")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                bulkAction === "skip"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-200 dark:bg-dark-hover text-gray-700 dark:text-dark-textSecondary hover:bg-gray-300 dark:hover:bg-dark-divider"
              }`}
            >
              Skip All
            </button>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`border rounded-lg p-4 ${getConflictColor(
                conflict.conflictType
              )}`}
            >
              <div className="flex items-start gap-3 mb-3">
                {getConflictIcon(conflict.conflictType)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-textPrimary">
                    {conflict.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Event */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
                      Local Event
                    </span>
                  </div>
                  <div className="bg-white dark:bg-dark-background rounded-lg p-3 border border-gray-200 dark:border-dark-divider">
                    <h4 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-1">
                      {conflict.localEvent.title}
                    </h4>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-dark-textSecondary">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(conflict.localEvent.start).toLocaleString()} -{" "}
                        {new Date(conflict.localEvent.end).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google Event */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
                      Google Calendar
                    </span>
                  </div>
                  <div className="bg-white dark:bg-dark-background rounded-lg p-3 border border-gray-200 dark:border-dark-divider">
                    <h4 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-1">
                      {conflict.googleEvent.summary}
                    </h4>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-dark-textSecondary">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDateTime(
                          conflict.googleEvent.start.dateTime,
                          conflict.googleEvent.start.date
                        )}{" "}
                        -{" "}
                        {formatDateTime(
                          conflict.googleEvent.end.dateTime,
                          conflict.googleEvent.end.date
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision Options */}
              <div className="mt-4 space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
                  Choose which version to keep:
                </span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`conflict-${conflict.id}`}
                      value="useLocal"
                      checked={decisions[conflict.id] === "useLocal"}
                      onChange={() =>
                        handleDecisionChange(conflict.id, "useLocal")
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-textSecondary">
                      Keep Local
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`conflict-${conflict.id}`}
                      value="useGoogle"
                      checked={decisions[conflict.id] === "useGoogle"}
                      onChange={() =>
                        handleDecisionChange(conflict.id, "useGoogle")
                      }
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-textSecondary">
                      Keep Google
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`conflict-${conflict.id}`}
                      value="skip"
                      checked={decisions[conflict.id] === "skip"}
                      onChange={() => handleDecisionChange(conflict.id, "skip")}
                      className="text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-textSecondary">
                      Skip
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t dark:border-dark-divider bg-gray-50 dark:bg-dark-secondary">
          <div className="text-sm text-gray-600 dark:text-dark-textSecondary">
            {Object.keys(decisions).length} of {conflicts.length} conflicts
            resolved
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Apply Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
