"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send, X } from "lucide-react";
import { DynamicSchema } from "./BulletinDynamic";

interface DynamicNoteCreatorProps {
  onCreateNote: (title: string, schema: DynamicSchema) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

export default function DynamicNoteCreator({
  onCreateNote,
  onClose,
  isOpen,
}: DynamicNoteCreatorProps) {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsGenerating(true);
    setError("");

    try {
      // Call the API to generate the schema from the description
      const response = await fetch("/api/bulletins/generate-dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate note schema");
      }

      const { title, schema } = await response.json();

      // Create the note with the generated schema
      await onCreateNote(title, schema);

      // Reset and close
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error generating dynamic note:", error);
      setError("Failed to generate note. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
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
              <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-light-heading dark:text-dark-textPrimary">
                Create Dynamic Note
              </h2>
              <p className="text-sm text-light-subtle dark:text-dark-textSecondary">
                Describe what kind of note you want to create
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-2 text-light-subtle dark:text-dark-textSecondary hover:text-light-heading dark:hover:text-dark-textPrimary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-light-heading dark:text-dark-textPrimary">
              Describe your note
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: 'A daily planner with a checklist for tasks, a section for goals, and a notes area for thoughts'"
              rows={4}
              className="w-full p-4 border border-light-border dark:border-dark-divider rounded-lg bg-white dark:bg-dark-background text-light-heading dark:text-dark-textPrimary placeholder:text-light-subtle dark:placeholder:text-dark-textSecondary focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 resize-vertical"
              disabled={isGenerating}
            />
            <p className="mt-2 text-xs text-light-subtle dark:text-dark-textSecondary">
              Be specific about the sections, input types, and layout you want.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Examples */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-2 text-light-heading dark:text-dark-textPrimary">
              Example ideas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "A workout tracker with exercises and reps",
                "A recipe card with ingredients and instructions",
                "A meeting notes template with attendees and action items",
                "A book review form with rating and summary",
              ].map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setDescription(example)}
                  disabled={isGenerating}
                  className="text-left p-2 text-xs bg-light-secondary dark:bg-dark-primary border border-light-border dark:border-dark-divider rounded text-light-subtle dark:text-dark-textSecondary hover:text-light-heading dark:hover:text-dark-textPrimary hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isGenerating}
              className="px-4 py-2 text-sm text-light-subtle dark:text-dark-textSecondary hover:text-light-heading dark:hover:text-dark-textPrimary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim() || isGenerating}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-green-500 dark:hover:bg-green-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
