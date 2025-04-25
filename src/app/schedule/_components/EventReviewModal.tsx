import { useState } from "react";
import { CalendarIcon, CheckIcon, Pencil } from "lucide-react";
import clsx from "clsx";

export interface ExtractedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

interface EventReviewModalProps {
  events: ExtractedEvent[];
  onBack: () => void;
  onAddAll: (selectedEvents: ExtractedEvent[]) => void;
}

export default function EventReviewModal({
  events,
  onBack,
  onAddAll,
}: EventReviewModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(events.map((e) => e.id))
  );
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editedEvents, setEditedEvents] = useState<
    Record<string, ExtractedEvent>
  >({});

  const toggleSelect = (id: string) => {
    setSelectedIds(
      (prev) =>
        new Set(
          prev.has(id) ? [...prev].filter((x) => x !== id) : [...prev, id]
        )
    );
  };

  const selectAll = () => setSelectedIds(new Set(events.map((e) => e.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleEdit = (event: ExtractedEvent) => {
    setEditingEventId(event.id);
    setEditedEvents((prev) => ({ ...prev, [event.id]: { ...event } }));
  };

  const handleChange = (
    id: string,
    field: keyof ExtractedEvent,
    value: string
  ) => {
    setEditedEvents((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = (id: string) => {
    const updated = editedEvents[id];
    const index = events.findIndex((e) => e.id === id);
    if (index > -1) {
      events[index] = updated;
    }
    setEditingEventId(null);
  };

  const handleCancel = () => {
    setEditingEventId(null);
  };

  const selectedEvents = events.filter((e) => selectedIds.has(e.id));

  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-dark-textSecondary mb-4">
        Select the events you want to add to your calendar.
      </p>

      <div className="flex justify-between items-center text-sm mb-4">
        <span className="text-gray-700 dark:text-dark-textSecondary">
          {selectedIds.size} of {events.length} events selected
        </span>
        <div className="space-x-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-dark-divider text-gray-700 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover transition"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-dark-divider text-gray-700 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover transition"
          >
            Deselect All
          </button>
        </div>
      </div>

      <ul className="max-h-64 overflow-y-auto space-y-3 pr-1">
        {events.map((event) => {
          const isSelected = selectedIds.has(event.id);
          const isEditing = editingEventId === event.id;
          const display = isEditing ? editedEvents[event.id] : event;

          return (
            <li
              key={event.id}
              className={clsx(
                "border rounded-xl p-4 transition",
                "bg-gray-100 dark:bg-dark-paper border-gray-300 dark:border-dark-divider"
              )}
            >
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={display.title}
                    onChange={(e) =>
                      handleChange(event.id, "title", e.target.value)
                    }
                    className="w-full mb-2 px-3 py-2 text-sm rounded border border-gray-300 dark:border-dark-divider dark:bg-dark-background dark:text-dark-textPrimary"
                    placeholder="Event Title"
                  />
                  <div className="flex gap-2 mb-2">
                    <input
                      type="datetime-local"
                      value={display.start.slice(0, 16)}
                      onChange={(e) =>
                        handleChange(event.id, "start", e.target.value)
                      }
                      className="w-1/2 px-3 py-2 text-sm rounded border border-gray-300 dark:border-dark-divider dark:bg-dark-background dark:text-dark-textPrimary"
                    />
                    <input
                      type="datetime-local"
                      value={display.end.slice(0, 16)}
                      onChange={(e) =>
                        handleChange(event.id, "end", e.target.value)
                      }
                      className="w-1/2 px-3 py-2 text-sm rounded border border-gray-300 dark:border-dark-divider dark:bg-dark-background dark:text-dark-textPrimary"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-dark-actionDisabledBackground rounded hover:bg-gray-400 dark:hover:bg-dark-actionHover"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(event.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => toggleSelect(event.id)}
                >
                  <div className="w-full">
                    <p className="text-sm font-semibold text-gray-900 dark:text-dark-textPrimary">
                      {display.title}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-dark-textSecondary">
                      {new Date(display.start).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(display.start).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-textDisabled mt-0.5">
                      {new Date(display.start).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(display.end).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center justify-around gap-2 ml-3">
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      <Pencil size={16} />
                    </button>
                    {isSelected && (
                      <div className="bg-blue-600 dark:bg-blue-400 text-white rounded-full p-1.5 shadow-md">
                        <CheckIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-6 space-x-4">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-700 dark:text-dark-textSecondary rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-dark-actionHover transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-dark-divider"
        >
          ← Back to Upload
        </button>
        <button
          onClick={() => onAddAll(selectedEvents)}
          disabled={selectedEvents.length === 0}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            selectedEvents.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          Add {selectedEvents.length} Events
        </button>
      </div>
    </div>
  );
}
