"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg } from "@fullcalendar/core";
import { EventImpl } from "@fullcalendar/core/internal";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "tailwindcss/tailwind.css";
import EventCreationModal from "./_components/EventCreationModal";
import { DeleteEventModal } from "./_components/DeleteEventModal";

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventImpl | null>(null);

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
    setEventToDelete(clickInfo.event);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      setEvents(events.filter((event) => event.id !== eventToDelete.id));
      setIsDeleteModalOpen(false);
      setEventToDelete(null);
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
    <div className="p-6 max-w-[1600px] mx-auto bg-gray-200">
      <div className="flex gap-6">
        <div className="w-1/5 bg-white border border-gray-200 shadow-lg rounded-2xl p-6 flex flex-col gap-4 h-[calc(100vh-7rem)]">
          <h2 className="text-xl font-semibold text-gray-800 text-center">
            Type your schedule below
          </h2>

          <textarea
            className="flex-1 border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your schedule here..."
          />
          <button
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
        <div className="flex-1 bg-white border border-gray-200 shadow-lg rounded-2xl p-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
            height="calc(100vh - 10rem)"
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            buttonText={{
              today: "Today",
              month: "Month",
              week: "Week",
              day: "Day",
            }}
            dayMaxEventRows={3}
            views={{
              dayGridMonth: {
                titleFormat: { year: "numeric", month: "long" },
                dayHeaderFormat: { weekday: "short" },
              },
            }}
            themeSystem="standard"
            eventColor="#3b82f6"
            eventClassNames="rounded-md shadow-sm"
            dayCellClassNames="hover:bg-gray-50 transition-colors"
            dayHeaderClassNames="text-gray-700 font-medium py-3"
          />
        </div>

        <div className="w-1/5 bg-white border border-gray-200 shadow-lg rounded-2xl p-6 h-[calc(100vh-7rem)]">
          <h2 className="text-xl font-semibold text-gray-800">Coming Soon</h2>
        </div>
      </div>

      <button
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg text-2xl transition-colors duration-200 flex items-center justify-center"
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
      <DeleteEventModal
        isOpen={isDeleteModalOpen}
        event={eventToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
