"use client";

import { useState } from "react";
import { PencilRuler, Loader2, Send, X, AlertTriangle } from "lucide-react";
import { DynamicSchema } from "./BulletinDynamic";

interface NoteRefactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  currentSchema: DynamicSchema;
  currentData: Record<string, any>;
  onRefactor: (
    newTitle: string,
    newSchema: DynamicSchema,
    mappedData: Record<string, any>
  ) => Promise<void>;
}

export default function NoteRefactorModal({
  isOpen,
  onClose,
  currentTitle,
  currentSchema,
  currentData,
  onRefactor,
}: NoteRefactorModalProps) {
  const [description, setDescription] = useState("");
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsRefactoring(true);
    setError("");

    try {
      // Call the API to refactor the schema and map data
      const response = await fetch("/api/bulletins/refactor-dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          currentTitle,
          currentSchema,
          currentData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to refactor note schema");
      }

      const { title, schema, mappedData } = await response.json();

      // Apply the refactored structure
      await onRefactor(title, schema, mappedData);

      // Reset and close
      setDescription("");
    } catch (error) {
      console.error("Error refactoring note:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to refactor note. Please try again."
      );
    } finally {
      setIsRefactoring(false);
    }
  };

  const handleClose = () => {
    if (!isRefactoring) {
      setDescription("");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-light-border dark:border-dark-divider">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <PencilRuler className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-light-heading dark:text-dark-textPrimary">
                Refactor Note Structure
              </h2>
              <p className="text-sm text-light-subtle dark:text-dark-textSecondary">
                Describe how you want to restructure your note
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isRefactoring}
            className="p-2 text-light-subtle dark:text-dark-textSecondary hover:text-light-heading dark:hover:text-dark-textPrimary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Data Preservation
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    The AI will attempt to preserve your existing data when
                    restructuring, but some information might be lost if it
                    doesn't fit the new format.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-light-heading dark:text-dark-textPrimary">
              How would you like to restructure this note?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the changes you want to make to the note structure..."
              rows={4}
              className="w-full p-4 border border-light-border dark:border-dark-divider rounded-lg bg-white dark:bg-dark-background text-light-heading dark:text-dark-textPrimary placeholder:text-light-subtle dark:placeholder:text-dark-textSecondary focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 resize-vertical"
              disabled={isRefactoring}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Current Structure Preview */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-2 text-light-heading dark:text-dark-textPrimary">
              Current structure:
            </p>
            <div className="p-3 bg-light-secondary dark:bg-dark-primary border border-light-border dark:border-dark-divider rounded-lg">
              <p className="text-sm font-medium text-light-heading dark:text-dark-textPrimary mb-2">
                "{currentTitle}"
              </p>
              <div className="text-xs text-light-subtle dark:text-dark-textSecondary space-y-1">
                {currentSchema.components.map((component, index) => (
                  <div key={component.id}>
                    {index + 1}. {component.label} ({component.type})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isRefactoring}
              className="px-4 py-2 text-sm text-light-subtle dark:text-dark-textSecondary hover:text-light-heading dark:hover:text-dark-textPrimary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim() || isRefactoring}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-green-500 dark:hover:bg-green-600"
            >
              {isRefactoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Refactoring...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Refactor Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
