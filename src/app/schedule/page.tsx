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
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Sparkle, Type, FileUp, Plus } from "lucide-react";
import EventSuggestion from "./_components/EventSuggestion";

export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface GeneratedEvent {
  title: string;
  start: string;
  end: string;
}

export default function CalendarApp() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/login");
    },
  });
  const userId = session?.user?.id;

  const [events, setEvents] = useState<Event[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  const handleAddEvent = async (): Promise<void> => {
    console.log("Adding event:", newEvent);
    if (newEvent.title && newEvent.start && newEvent.end) {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newEvent.title,
          start: newEvent.start,
          end: newEvent.end,
        }),
      });
      if (!res.ok) {
        console.error("Failed to add event");
      }
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

  const handleDeleteConfirm = async () => {
    if (eventToDelete) {
      try {
        const res = await fetch(`/api/events/${eventToDelete.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Failed to delete event");
        }
        setEvents(events.filter((event) => event.id !== eventToDelete.id));
        setIsDeleteModalOpen(false);
        setEventToDelete(null);
      } catch (error) {
        console.error("Error deleting event:", error);
      }
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
        const formattedEvents = data.events.map((event: GeneratedEvent) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        await Promise.all(
          formattedEvents.map(async (event: GeneratedEvent) => {
            const res = await fetch("/api/events", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: event.title,
                start: event.start,
                end: event.end,
              }),
            });
            if (!res.ok) {
              console.error("Failed to save event to database");
            }
          })
        );

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

  const handleSuggestClick = async () => {
    if (!userId) {
      console.error("unable to get userId");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/generate-events/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ existingEvents: events, userId: userId }),
      });

      if (!response.ok) throw new Error("Failed to fetch suggestions");

      const data = await response.json();
      setSuggestedEvents(data.events);
    } catch (error) {
      console.error("Error suggesting events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (event: Event) => {
    try {
      const res = await fetch("api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: event.title,
          start: event.start,
          end: event.end,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add suggested event");
      }

      // Add to local events
      setEvents([...events, event]);

      // Remove from suggestions
      setSuggestedEvents(suggestedEvents.filter((e) => e.id !== event.id));
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };

  const handleRejectSuggestion = (eventId: string) => {
    setSuggestedEvents(suggestedEvents.filter((e) => e.id !== eventId));
  };

  return (
    <div className="p-6 max-w-[1600px] h-[92.25vh] mx-auto bg-gray-200">
      <div className="flex gap-6">
        <div className="flex-1 bg-white shadow-lg rounded-2xl p-6">
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

        <div className="w-1/3 bg-white border border-gray shadow-lg rounded-2xl py-6 px-4 h-[calc(100vh-7rem)]">
          <div className="flex flex-col h-full justify-between items-center">
            <div className="flex flex-col w-full">
              <div className="border">
                <button className="hover:bg-gray-100 transition-colors duration-200 p-2">
                  <Plus size={20} />
                </button>
                <button className="hover:bg-gray-100 transition-colors duration-200 p-2">
                  <Type size={20} />
                </button>
                <button className="hover:bg-gray-100 transition-colors duration-200 p-2">
                  <FileUp size={20} />
                </button>
              </div>
              <textarea
                className="flex p-4 resize-none bg-gray-100 focus:outline-none border rounded-br-md rounded-bl-md"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter your schedule here..."
              />
              <button
                className="w-full py-3 mt-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
            <div className="w-full">
              {suggestedEvents.length > 0 && (
                <div className="w-full flex flex-col justify-center items-center">
                  <h1 className="text-2xl pb-2">Suggested Tasks</h1>
                  {suggestedEvents.map((suggestedEvent) => (
                    <EventSuggestion
                      suggestedEvent={suggestedEvent}
                      key={suggestedEvent.id}
                      onAccept={handleAcceptSuggestion}
                      onReject={handleRejectSuggestion}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center w-full">
              <button
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors duration-200 shadow-sm"
                onClick={handleSuggestClick}
                disabled={loading}
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkle />
                  <span>Suggest</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        className="fixed bottom-2 right-2 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg text-2xl transition-colors duration-200 flex items-center justify-center"
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
