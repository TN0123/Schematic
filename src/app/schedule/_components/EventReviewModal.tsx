import { useState } from "react";
import { CalendarIcon, CheckIcon } from "lucide-react";
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

  const selectedEvents = events.filter((e) => selectedIds.has(e.id));

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-left">
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
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Deselect All
          </button>
        </div>
      </div>

      <ul className="max-h-64 overflow-y-auto space-y-3 pr-1">
        {events.map((event) => {
          const isSelected = selectedIds.has(event.id);
          return (
            <li
              key={event.id}
              className={clsx(
                "border rounded-lg p-4 flex justify-between items-start transition cursor-pointer",
                "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              )}
              onClick={() => toggleSelect(event.id)}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {event.title}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {new Date(event.start).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(event.start).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(event.start).toLocaleString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(event.end).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {isSelected && (
                <div className="bg-black dark:bg-white text-white dark:text-black rounded-full p-1">
                  <CheckIcon className="w-4 h-4" />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Back to Upload
        </button>
        <button
          onClick={() => onAddAll(selectedEvents)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition"
        >
          <CalendarIcon className="w-4 h-4" />
          Add {selectedEvents.length} Events to Calendar
        </button>
      </div>
    </div>
  );
}
