import React, { useEffect, useState } from "react";
import { Event } from "../types";
import { Reminder } from "./RemindersBar";

function formatDateTimeLocal(date: Date | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleReminderSubmit = () => {
    if (!reminderText.trim() || !reminderTime || !onCreateReminder) {
      return;
    }

    onCreateReminder({
      text: reminderText.trim(),
      time: new Date(reminderTime),
      isAISuggested,
    });

    // Animate out before closing and resetting
    setIsVisible(false);
    setTimeout(() => {
      setReminderText("");
      setReminderTime("");
      setIsAISuggested(false);
      setShowModal(false);
    }, 200);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      // Reset both forms after fade-out
      setReminderText("");
      setReminderTime("");
      setIsAISuggested(false);
      setShowModal(false);
    }, 200);
  };

  const handleAddEventWithExit = () => {
    handleAddEvent();
    setIsVisible(false);
    setTimeout(() => {
      setShowModal(false);
    }, 200);
  };

  const links = Array.isArray(newEvent.links) ? newEvent.links : [];
  const updateLinkAt = (idx: number, value: string) => {
    const next = [...links];
    next[idx] = value;
    setNewEvent({ ...newEvent, links: next });
  };
  const addLink = () => {
    setNewEvent({ ...newEvent, links: [...links, ""] });
  };
  const removeLinkAt = (idx: number) => {
    const next = links.filter((_, i) => i !== idx);
    setNewEvent({ ...newEvent, links: next });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleCancel}
    >
      <div
        className={`relative z-50 w-full max-w-lg transform rounded-2xl bg-white/90 dark:bg-dark-secondary/90 p-6 shadow-2xl ring-1 ring-black/5 backdrop-saturate-150 transition-all duration-200 ${
          isVisible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab Header */}
        <div className="mb-6 flex w-full justify-center">
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1 dark:bg-dark-actionDisabledBackground">
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                activeTab === "event"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-dark-secondary dark:text-dark-textPrimary"
                  : "text-gray-600 hover:text-gray-800 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
              }`}
              onClick={() => setActiveTab("event")}
            >
              Event
            </button>
            {onCreateReminder && (
              <button
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                  activeTab === "reminder"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-dark-secondary dark:text-dark-textPrimary"
                    : "text-gray-600 hover:text-gray-800 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                }`}
                onClick={() => setActiveTab("reminder")}
              >
                Reminder
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "event" ? (
          <>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
              Add Event
            </h3>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
              Event Title
            </label>
            <input
              type="text"
              className="mb-4 w-full rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              placeholder="Enter event title..."
            />
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
              Start Date
            </label>
            <input
              type="datetime-local"
              className="mb-4 w-full rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
              value={formatDateTimeLocal(newEvent.start)}
              onChange={(e) =>
                setNewEvent({ ...newEvent, start: new Date(e.target.value) })
              }
            />
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
              End Date
            </label>
            <input
              type="datetime-local"
              className="mb-4 w-full rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
              value={formatDateTimeLocal(newEvent.end)}
              onChange={(e) =>
                setNewEvent({ ...newEvent, end: new Date(e.target.value) })
              }
            />

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
                  Links (optional)
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  onClick={addLink}
                >
                  Add link
                </button>
              </div>
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="url"
                        className="flex-1 rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
                        value={link}
                        onChange={(e) => updateLinkAt(idx, e.target.value)}
                        placeholder="https://example.com"
                      />
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-sm text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => removeLinkAt(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.99] dark:border-dark-divider dark:bg-transparent dark:text-dark-textSecondary dark:hover:bg-dark-actionDisabledBackground"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-white shadow-md transition hover:from-blue-600 hover:to-indigo-600 active:scale-[0.99] dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500"
                onClick={handleAddEventWithExit}
              >
                Add Event
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
              Add Reminder
            </h3>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
              Reminder Text
            </label>
            <textarea
              className="mb-4 w-full resize-none rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
              rows={3}
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="Enter reminder text..."
            />
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
              Reminder Time
            </label>
            <input
              type="datetime-local"
              className="mb-4 w-full rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="isAISuggested"
                checked={isAISuggested}
                onChange={(e) => setIsAISuggested(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="isAISuggested"
                className="text-sm text-gray-700 dark:text-dark-textSecondary"
              >
                Mark as AI-suggested
              </label>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.99] dark:border-dark-divider dark:bg-transparent dark:text-dark-textSecondary dark:hover:bg-dark-actionDisabledBackground"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-white shadow-md transition hover:from-blue-600 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99] dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500"
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
