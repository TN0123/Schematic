import { useEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";

interface DeleteEventModalProps {
  isOpen: boolean;
  event: EventImpl | null;
  selectedCount?: number;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteEventModal({
  isOpen,
  event,
  selectedCount = 0,
  onClose,
  onDelete,
}: DeleteEventModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const isBulkDelete = !event || selectedCount > 1;
  const pluralSuffix = selectedCount === 1 ? "" : "s";

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-secondary rounded-2xl p-6 w-96 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-textPrimary mb-4">
          {isBulkDelete
            ? `Delete ${selectedCount} Event${pluralSuffix}`
            : "Delete Event"}
        </h2>
        <p className="text-gray-600 dark:text-dark-textSecondary mb-6">
          {isBulkDelete
            ? `Are you sure you want to delete ${selectedCount} selected event${pluralSuffix}?`
            : `Are you sure you want to delete "${event?.title}"?`}
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            autoFocus
            onClick={onDelete}
            className="px-4 py-2 rounded-lg bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
