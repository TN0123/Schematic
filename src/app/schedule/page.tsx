"use client";

import { useState, useEffect } from "react";
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
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/generate-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await response.json();
      if (data.events) {
        const formattedEvents = data.events.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        setEvents([...events, ...formattedEvents]);
      }
    } catch (error) {
      console.error("Error generating events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Updated events:", events);
  }, [events]);

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-4 text-center">Schedule</h2>
      <div className="flex justify-between">
        <div className="w-2/5 border-2 flex flex-col items-center">
          <h2 className="text-l font-bold text-center">
            Type your schedule below
          </h2>
          <textarea
            className="w-3/4 h-3/4 border-2 resize-none"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
          <button
            className="border-2 w-3/4 bg-green-200 p-2"
            disabled={loading}
            type="submit"
            onClick={handleSubmit}
          >
            Generate
          </button>
          {/* Add the onclick handleSubmit to this button, make it type submit*/}
        </div>
        <div className="w-3/5 border-t-2">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
            height="80vh"
            headerToolbar={{
              start: "prev,next,today",
              center: "title",
              right: "timeGridWeek,timeGridDay,dayGridMonth",
            }}
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
