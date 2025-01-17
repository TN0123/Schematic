import React, { useState } from "react";

export default function EventCreationModal({
  onCreate,
}: {
  onCreate: (event: {
    title: string;
    startDate: string;
    endDate: string;
    allDay: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allDay, setAllDay] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (title && startDate) {
      onCreate({ title, startDate, endDate, allDay });
      setTitle("");
      setStartDate("");
      setEndDate("");
      setAllDay(false);
    } else {
      alert("Title and Start Date are required!");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center border-2 border-gray-200 bg-gray-300 rounded-lg p-4 mx-4 my-2">
      <h2 className="text-xl mb-4">Create New Event</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="font-bold w-1/2">Event Title: </label>
          <input
            type="text"
            placeholder="Enter event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-1/2 text-center"
          />
        </div>
        <div className="mb-4">
          <label className="font-bold w-1/2">Start: </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-1/2 text-center"
          />
        </div>
        <div className="mb-4">
          <label className="font-bold w-1/2">End: </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-1/2 text-center"
          />
        </div>
        <div className="mb-4">
          <label className="font-bold w-1/2">All-Day: </label>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="w-auto"
          />
        </div>
        <div className="flex justify-center space-x-4">
          <button
            type="button"
            className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600"
            onClick={() => {
              setTitle("");
              setStartDate("");
              setEndDate("");
              setAllDay(false);
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create Event
          </button>
        </div>
      </form>
    </div>
  );
}
