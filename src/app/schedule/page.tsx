"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "tailwindcss/tailwind.css";
import EventCreationModal from "./_components/EventCreationModal";

export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export default function CalendarApp() {
  const [events, setEvents] = useState<Event[]>([
    { id: "1", title: "Sample Event", start: new Date(), end: new Date() },
  ]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newEvent, setNewEvent] = useState({
    id: "",
    title: "",
    start: new Date(),
    end: new Date(),
  });

  const handleAddEvent = (): void => {
    if (newEvent.title && newEvent.start && newEvent.end) {
      setEvents([
        ...events,
        {
          id: Date.now().toString(),
          title: newEvent.title,
          start: newEvent.start,
          end: newEvent.end,
        },
      ]);
      setShowModal(false);
      setNewEvent({ id: "", title: "", start: new Date(), end: new Date() });
    }
  };

  const handleEventClick = (clickInfo: EventClickArg): void => {
    if (confirm(`Delete event '${clickInfo.event.title}'?`)) {
      setEvents(events.filter((event) => event.id !== clickInfo.event.id));
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-4 text-center">Schedule</h2>
      <div className="flex justify-between">
        <div className="w-2/5 border-2 flex flex-col items-center">
          <h2 className="text-l font-bold text-center">
            Type your schedule below
          </h2>
          <textarea className="w-3/4 h-3/4 border-2 resize-none"></textarea>
          <button className="border-2 w-3/4 bg-green-200 p-2">Generate</button>
        </div>
        {/* New control panel component to the right of the above code*/}
        <div className="w-3/5 border-t-2">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
          />
        </div>
      </div>

      <button
        className="fixed bottom-10 right-10 bg-blue-500 w-16 h-16 text-white p-4 rounded-full shadow-lg text-2xl z-50"
        onClick={() => setShowModal(true)}
      >
        +
      </button>

      {showModal && (
        <EventCreationModal
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          setShowModal={setShowModal}
          handleAddEvent={handleAddEvent}
        />
      )}
    </div>
  );
}
