import React, { useState } from "react";
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
      className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg w-96 relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Add Event</h3>
        <label className="block mb-2">Event Title</label>
        <input
          type="text"
          className="w-full p-2 border rounded mb-4"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <label className="block mb-2">Start Date</label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded mb-4"
          onChange={(e) =>
            setNewEvent({ ...newEvent, start: new Date(e.target.value) })
          }
        />
        <label className="block mb-2">End Date</label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded mb-4"
          onChange={(e) =>
            setNewEvent({ ...newEvent, end: new Date(e.target.value) })
          }
        />
        <div className="flex justify-between">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded"
            onClick={() => setShowModal(false)}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleAddEvent}
          >
            Add Event
          </button>
        </div>
      </div>
    </div>
  );
}
