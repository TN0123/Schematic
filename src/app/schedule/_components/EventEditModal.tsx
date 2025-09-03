import { Event } from "../types";
import { Trash2 } from "lucide-react";

function formatDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function EventEditModal({
  newEvent,
  setNewEvent,
  onClose,
  handleEditEvent,
  handleDeleteEvent,
}: {
  newEvent: Event;
  setNewEvent: React.Dispatch<React.SetStateAction<Event>>;
  onClose: () => void;
  handleEditEvent: () => void;
  handleDeleteEvent: () => void;
}) {
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
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 z-50">
      <div
        className="bg-white dark:bg-dark-secondary p-6 rounded-lg shadow-lg w-96 relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-5 top-5 p-2 text-light-icon hover:bg-red-300 dark:hover:bg-red-900 rounded-lg transition-all"
          onClick={handleDeleteEvent}
        >
          <Trash2 size={20} />
        </button>

        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-textPrimary">
          Edit Event
        </h3>

        <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
          Event Title
        </label>
        <input
          type="text"
          className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
          value={newEvent?.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
          Start Date
        </label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
          value={newEvent.start ? formatDateTimeLocal(newEvent.start) : ""}
          onChange={(e) => {
            const value = e.target.value;
            setNewEvent((prev) => ({
              ...prev,
              start: value ? new Date(value) : prev.start,
            }));
          }}
        />
        <label className="block mb-2 text-gray-700 dark:text-dark-textSecondary">
          End Date
        </label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
          value={newEvent.end ? formatDateTimeLocal(newEvent.end) : ""}
          onChange={(e) => {
            const value = e.target.value;
            setNewEvent((prev) => ({
              ...prev,
              end: value ? new Date(value) : prev.end,
            }));
          }}
        />

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-700 dark:text-dark-textSecondary">
              Links (optional)
            </label>
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
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
                    className="flex-1 p-2 border rounded bg-gray-100 dark:bg-dark-actionDisabledBackground text-gray-900 dark:text-dark-textPrimary border-gray-300 dark:border-dark-divider"
                    value={link}
                    onChange={(e) => updateLinkAt(idx, e.target.value)}
                    placeholder="https://example.com"
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-sm text-red-600 hover:underline"
                    onClick={() => removeLinkAt(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            className="bg-gray-500 dark:bg-dark-actionDisabledBackground text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-dark-actionHover"
            onClick={() => onClose()}
          >
            Cancel
          </button>
          <button
            className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded hover:bg-green-600 dark:hover:bg-green-500"
            onClick={handleEditEvent}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
