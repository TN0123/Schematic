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
import { SessionProvider, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { RefreshCcw, Type, FileUp, Plus } from "lucide-react";
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
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
  const [hasFetchedInitialSuggestions, setHasFetchedInitialSuggestions] =
    useState(false);

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
        body: JSON.stringify({ text: inputText, timezone: userTimezone }),
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

  useEffect(() => {
    if (!hasFetchedInitialSuggestions && userId) {
      fetchSuggestions();
      setHasFetchedInitialSuggestions(true);
    }
  }, [hasFetchedInitialSuggestions, userId]);

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const endOfDay = new Date(currentDate);
  endOfDay.setHours(23, 59, 59, 999);

  const todaysEvents = events.filter((event) => {
    const eventStart = new Date(event.start);
    return eventStart >= currentDate && eventStart <= endOfDay;
  });

  const fetchSuggestions = async () => {
    if (!userId) {
      console.error("unable to get userId");
      return;
    }

    try {
      const response = await fetch(`/api/generate-events/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          existingEvents: todaysEvents,
          userId: userId,
          timezone: userTimezone,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch suggestions");

      const data = await response.json();
      setSuggestedEvents(data.events);
    } catch (error) {
      console.error("Error suggesting events:", error);
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

  useEffect(() => {
    setTimeout(() => {
      const timeGridScroller = document.querySelector(".fc-timegrid-body");

      if (timeGridScroller && timeGridScroller.parentElement) {
        timeGridScroller.parentElement.style.scrollBehavior = "smooth";
        timeGridScroller.parentElement.scrollTop = 400;
      }
    }, 50);
  }, []);

  return (
    <SessionProvider>
      <div className="h-[92.25vh] flex flex-col bg-white">
        <div className="flex flex-1 h-full">
          {/* Calendar */}
          <div className="flex-1 p-4 h-full transition-all duration-200">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              events={events}
              eventClick={handleEventClick}
              height="calc(100vh - 6rem)"
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
              eventClassNames="rounded-lg shadow-md bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
              dayCellClassNames="hover:bg-gray-100 transition-colors duration-200"
              dayHeaderClassNames="text-gray-700 font-semibold py-3 border-b"
              nowIndicator={true}
              nowIndicatorClassNames="border-red-500"
              scrollTimeReset={false}
              allDaySlot={false}
            />
          </div>

          {/* Side Panel */}
          <aside className="w-96 bg-white border-l px-6 py-4 flex flex-col gap-4">
            {/* Menu Bar */}
            <div className="flex">
              <button
                className="hover:bg-gray-100 transition-colors duration-200 p-2"
                onClick={() => setShowModal(true)}
              >
                <Plus size={20} />
              </button>
              <button className="hover:bg-gray-100 transition-colors duration-200 p-2">
                <Type size={20} />
              </button>
              <button className="hover:bg-gray-100 transition-colors duration-200 p-2">
                <FileUp size={20} />
              </button>
            </div>

            {/* Input Field */}
            <textarea
              className="flex p-4 h-auto resize-none bg-gray-100 focus:outline-none border rounded-br-md rounded-bl-md"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = "auto";
                textarea.style.height = `${Math.min(
                  textarea.scrollHeight,
                  140
                )}px`;
              }}
              placeholder="Enter your schedule here..."
            />
            <button
              className="w-full py-3 mt-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
            <div className="w-full border-t">
              {suggestedEvents.length > 0 && (
                <div className="w-full flex flex-col justify-center items-center">
                  <div className="flex items-center justify-between px-2 w-full">
                    <h1 className="text-md py-2">Suggested</h1>
                    <button className="px-2" onClick={fetchSuggestions}>
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCcw
                          className="hover:text-blue-500 transition-all duration-200"
                          size={16}
                        />
                      </div>
                    </button>
                  </div>
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
          </aside>
        </div>

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
    </SessionProvider>
  );
}
