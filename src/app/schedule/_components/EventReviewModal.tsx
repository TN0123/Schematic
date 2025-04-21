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
  onAddEvent: (event: ExtractedEvent) => void;
  onAddAll: (selectedEvents: ExtractedEvent[]) => void;
}

export default function EventReviewModal({
  events,
  onBack,
  onAddEvent,
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
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
        Review Extracted Events
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Select the events you want to add to your calendar.
      </p>

      <div className="flex justify-between items-center text-sm mb-4">
        <span className="text-gray-700 dark:text-gray-300">
          {selectedIds.size} of {events.length} events selected
        </span>
        <div className="space-x-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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
                "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
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
                    className="w-full mb-2 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    placeholder="Event Title"
                  />
                  <div className="flex gap-2 mb-2">
                    <input
                      type="datetime-local"
                      value={display.start.slice(0, 16)}
                      onChange={(e) =>
                        handleChange(event.id, "start", e.target.value)
                      }
                      className="w-1/2 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <input
                      type="datetime-local"
                      value={display.end.slice(0, 16)}
                      onChange={(e) =>
                        handleChange(event.id, "end", e.target.value)
                      }
                      className="w-1/2 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {display.title}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-600"
        >
          ← Back to Upload
        </button>
        <button
          onClick={() => onAddAll(selectedEvents)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <CalendarIcon className="w-5 h-5" />
          Add {selectedEvents.length} Events
        </button>
      </div>
    </div>
  );
}
