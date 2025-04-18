import React from "react";
import { Event } from "../page";

export default function EventCreationModal({
  newEvent,
  setNewEvent,
  setShowModal,
  handleAddEvent,
}: {
  newEvent: Event;
  setNewEvent: React.Dispatch<React.SetStateAction<Event>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddEvent: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-70 z-50"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Add Event
        </h3>
        <label className="block mb-2 text-gray-700 dark:text-gray-300">
          Event Title
        </label>
        <input
          type="text"
          className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <label className="block mb-2 text-gray-700 dark:text-gray-300">
          Start Date
        </label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          onChange={(e) =>
            setNewEvent({ ...newEvent, start: new Date(e.target.value) })
          }
        />
        <label className="block mb-2 text-gray-700 dark:text-gray-300">
          End Date
        </label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded mb-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          onChange={(e) =>
            setNewEvent({ ...newEvent, end: new Date(e.target.value) })
          }
        />
        <div className="flex justify-between">
          <button
            className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-600 dark:hover:bg-gray-500"
            onClick={() => setShowModal(false)}
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
      </div>
    </div>
  );
}
