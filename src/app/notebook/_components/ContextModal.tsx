import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: any;
}

export default function ContextModal({
  isOpen,
  onClose,
  documentId,
}: ContextModalProps) {
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      setIsLoading(true);
      fetch(`/api/notebook/context?documentId=${documentId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.context) {
            setContext(data.context);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Failed to fetch context", error);
          setIsLoading(false);
        });
    }
  }, [isOpen, documentId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/notebook/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId, context }),
      });

      if (!response.ok) {
        throw new Error("Failed to save context");
      }

      onClose();
    } catch (error) {
      console.error("Failed to save context", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-dark-paper rounded-xl shadow-lg w-full max-w-lg p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                Edit AI Context
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-hover"
              >
                <X
                  size={24}
                  className="text-gray-600 dark:text-dark-textSecondary"
                />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-textSecondary mb-4">
              This context helps the AI understand what you are writing about.
              It is automatically updated by the AI during chats to help it stay
              up to date with your intentions when writing. Modifying it will
              change how the AI responds and assists you.
            </p>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <p>Loading context...</p>
              </div>
            ) : (
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full h-48 p-3 bg-gray-50 dark:bg-dark-secondary border border-gray-300 dark:border-dark-divider rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-dark-textPrimary"
                placeholder="Enter context for the AI..."
              />
            )}
            <div className="flex justify-end items-center mt-6 gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-dark-secondary dark:text-dark-textPrimary dark:hover:bg-dark-hover transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 transition"
              >
                {isSaving ? "Saving..." : "Save Context"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
