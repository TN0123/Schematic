import React, { useState } from "react";
import { Event } from "../types";
import { Reminder } from "./RemindersBar";

interface EventCreationModalProps {
  newEvent: Event;
  setNewEvent: React.Dispatch<React.SetStateAction<Event>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddEvent: () => void;
  onCreateReminder?: (reminder: Omit<Reminder, "id" | "isRead">) => void;
  initialTab?: "event" | "reminder";
}

export default function EventCreationModal({
  newEvent,
  setNewEvent,
  setShowModal,
  handleAddEvent,
  onCreateReminder,
  initialTab = "event",
}: EventCreationModalProps) {
  const [activeTab, setActiveTab] = useState<"event" | "reminder">(initialTab);
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [isAISuggested, setIsAISuggested] = useState(false);

  const handleReminderSubmit = () => {
    if (!reminderText.trim() || !reminderTime || !onCreateReminder) {
      return;
    }

    onCreateReminder({
      text: reminderText.trim(),
      time: new Date(reminderTime),
      isAISuggested,
    });

    // Reset form
    setReminderText("");
    setReminderTime("");
    setIsAISuggested(false);
    setShowModal(false);
  };

  const handleCancel = () => {
    // Reset both forms
    setReminderText("");
    setReminderTime("");
    setIsAISuggested(false);
    setShowModal(false);
  };
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 z-50"
      onClick={handleCancel}
    >
      <div
        className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg w-96 relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab Header */}
        <div className="flex mb-4 border-b border-gray-200 dark:border-dark-divider">
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "event"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 dark:hover:text-dark-textPrimary"
            }`}
            onClick={() => setActiveTab("event")}
          >
            Event
          </button>
          {onCreateReminder && (
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "reminder"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 dark:hover:text-dark-textPrimary"
              }`}
              onClick={() => setActiveTab("reminder")}
            >
              Reminder
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "event" ? (
          <>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-textPrimary">
              Add Event
            </h3>
            <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
              Event Title
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              placeholder="Enter event title..."
            />
            <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
              Start Date
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
              onChange={(e) =>
                setNewEvent({ ...newEvent, start: new Date(e.target.value) })
              }
            />
            <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
              End Date
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
              onChange={(e) =>
                setNewEvent({ ...newEvent, end: new Date(e.target.value) })
              }
            />
            <div className="flex justify-between">
              <button
                className="bg-gray-500 dark:bg-dark-actionDisabledBackground text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-dark-actionHover"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-500"
                onClick={handleAddEvent}
              >
                Add Event
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-textPrimary">
              Add Reminder
            </h3>
            <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
              Reminder Text
            </label>
            <textarea
              className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider resize-none"
              rows={3}
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="Enter reminder text..."
            />
            <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
              Reminder Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="isAISuggested"
                checked={isAISuggested}
                onChange={(e) => setIsAISuggested(e.target.checked)}
                className="mr-2"
              />
            </div>
            <div className="flex justify-between">
              <button
                className="bg-gray-500 dark:bg-dark-actionDisabledBackground text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-dark-actionHover"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleReminderSubmit}
                disabled={!reminderText.trim() || !reminderTime}
              >
                Add Reminder
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
