import { Event } from "../types";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeUrl } from "@/lib/url";

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const links = Array.isArray(newEvent.links) ? newEvent.links : [];
  const updateLinkAt = (idx: number, value: string) => {
    const next = [...links];
    next[idx] = value;
    setNewEvent({ ...newEvent, links: next });
  };
  const addLink = () => {
    const next = [...links, ""];
    setNewEvent({ ...newEvent, links: next });
    setEditingIndex(next.length - 1);
    setEditingValue("");
  };
  const removeLinkAt = (idx: number) => {
    const next = links.filter((_, i) => i !== idx);
    setNewEvent({ ...newEvent, links: next });
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  const handleSaveWithExit = () => {
    handleEditEvent();
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  const handleDeleteWithExit = () => {
    setIsVisible(false);
    setTimeout(() => {
      handleDeleteEvent();
      onClose();
    }, 200);
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
        <button
          className="absolute right-5 top-5 rounded-lg p-2 text-red-600/90 hover:bg-red-50 transition-all dark:hover:bg-red-950/30"
          onClick={handleDeleteWithExit}
        >
          <Trash2 size={20} />
        </button>

        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
          Edit Event
        </h3>

        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
          Event Title
        </label>
        <input
          type="text"
          className="mb-4 w-full rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
          value={newEvent?.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
          Start Date
        </label>
        <input
          type="datetime-local"
          className="mb-4 w-full rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
          value={newEvent.start ? formatDateTimeLocal(newEvent.start) : ""}
          onChange={(e) => {
            const value = e.target.value;
            setNewEvent((prev) => ({
              ...prev,
              start: value ? new Date(value) : prev.start,
            }));
          }}
        />
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
          End Date
        </label>
        <input
          type="datetime-local"
          className="mb-4 w-full rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
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
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
              Links
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
            <div className="space-y-3">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  {editingIndex === idx ? (
                    <>
                      <input
                        type="url"
                        className="flex-1 rounded-xl border border-gray-300 bg-white/60 p-2.5 text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 dark:border-dark-divider dark:bg-dark-actionDisabledBackground dark:text-dark-textPrimary"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        placeholder="https://example.com"
                      />
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-sm text-green-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => {
                          const normalized = normalizeUrl(editingValue.trim());
                          updateLinkAt(idx, normalized);
                          setEditingIndex(null);
                          setEditingValue("");
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-dark-actionDisabledBackground"
                        onClick={() => {
                          setEditingIndex(null);
                          setEditingValue("");
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href={link || "#"}
                        onClick={(e) => {
                          if (!link) e.preventDefault();
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate text-blue-600 dark:text-blue-400 hover:underline"
                        title={link}
                      >
                        {link || "(empty)"}
                      </a>
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-sm text-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingValue(link);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="px-2.5 py-1.5 text-sm text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => removeLinkAt(idx)}
                      >
                        Remove
                      </button>
                    </>
                  )}
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
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2 text-white shadow-md transition hover:from-emerald-600 hover:to-green-600 active:scale-[0.99] dark:from-emerald-600 dark:to-green-600 dark:hover:from-emerald-500 dark:hover:to-green-500"
            onClick={handleSaveWithExit}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
