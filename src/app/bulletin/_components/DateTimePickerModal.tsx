import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string | null, time: string | null) => void;
  currentDate?: string;
  currentTime?: string;
  position?: { top: number; left: number };
}

export default function DateTimePickerModal({
  isOpen,
  onClose,
  onSave,
  currentDate,
  currentTime,
  position,
}: DateTimePickerModalProps) {
  // Get current time rounded to next 15 minutes as default
  const getDefaultTime = () => {
    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes);
    now.setSeconds(0);
    return now.toTimeString().slice(0, 5);
  };

  const [selectedDate, setSelectedDate] = useState<string>(
    currentDate || new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>(currentTime || "");

  useEffect(() => {
    setSelectedDate(currentDate || new Date().toISOString().split("T")[0]);
    const defaultTime = currentTime || getDefaultTime();
    setSelectedTime(defaultTime);
  }, [currentDate, currentTime, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selectedDate || null, selectedTime || null);
    onClose();
  };

  const handleClear = () => {
    onSave(null, null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-dark-background rounded-lg shadow-xl border dark:border-dark-divider p-6 w-80 max-w-md"
        style={
          position
            ? {
                position: "fixed",
                top: position.top,
                left: position.left,
                transform: "translate(-50%, 0)",
              }
            : undefined
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600 dark:text-dark-textSecondary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
              Set due date & time
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-dark-textSecondary" />
          </button>
        </div>

        {/* Date Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-secondary dark:text-dark-textPrimary transition-all"
          />
        </div>

        {/* Time Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-2">
            Time
          </label>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-secondary dark:text-dark-textPrimary transition-all"
          />
          <p className="text-xs text-gray-500 dark:text-dark-textSecondary mt-2">
            Creates a 30-minute event in your schedule
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          {(currentDate || currentTime) && (
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
