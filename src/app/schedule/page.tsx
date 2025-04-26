"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { EventImpl } from "@fullcalendar/core/internal";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "tailwindcss/tailwind.css";
import EventCreationModal from "./_components/EventCreationModal";
import { DeleteEventModal } from "./_components/DeleteEventModal";
import { SessionProvider, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EventGenerationPanel from "./_components/EventGenerationPanel";
import GoalsPanel from "./_components/GoalsPanel";
import FileUploaderModal from "./_components/FileUploaderModal";

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
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFileUploaderModalOpen, setIsFileUploaderModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventImpl | null>(null);
  const [hasFetchedInitialSuggestions, setHasFetchedInitialSuggestions] =
    useState(false);
  const [fetchedRange, setFetchedRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [extractedEvents, setExtractedEvents] = useState<Event[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set()
  );

  const fetchEvents = async (startStr: string, endStr: string) => {
    setCalendarLoading(true);
    try {
      const response = await fetch(
        `/api/events?start=${startStr}&end=${endStr}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const isRangeInsideFetched = (start: Date, end: Date) => {
    if (!fetchedRange) return false;
    return start >= fetchedRange.start && end <= fetchedRange.end;
  };

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

      const createdEvent = await res.json();

      setEvents([
        ...events,
        {
          id: createdEvent.id,
          title: newEvent.title,
          start: new Date(createdEvent.start),
          end: new Date(createdEvent.end),
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

  const handleEventDrop = async (dropInfo: any) => {
    const { id } = dropInfo.event;
    const start = dropInfo.event.start;
    const end = dropInfo.event.end;

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: start?.toISOString(),
          end: end?.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update event");
      }

      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === id
            ? { ...event, start: start || event.start, end: end || event.end }
            : event
        )
      );

      console.log("Event updated successfully");
    } catch (error) {
      console.error("Error updating event:", error);
      dropInfo.revert();
    }
  };

  const handleDelete = async () => {
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

  const handleDeleteMany = async () => {
    const idsToDelete = Array.from(selectedEventIds);
    if (idsToDelete.length === 0) return;
    try {
      await fetch(`/api/event/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      setEvents((prev) => prev.filter((e) => !idsToDelete.includes(e.id)));
      setSelectedEventIds(new Set());
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting multiple events:", error);
    }
  };

  const handleBackspaceDelete = () => {
    if (selectedEventIds.size > 0) {
      setEventToDelete(null);
      setIsDeleteModalOpen(true);
    }
  };
  const handleSelect = (selectInfo: DateSelectArg) => {
    const selectedStart = new Date(selectInfo.start);
    const selectedEnd = new Date(selectInfo.end);

    const eventsInRange = events.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart < selectedEnd && eventEnd > selectedStart;
    });

    setSelectedEventIds(new Set(eventsInRange.map((e) => e.id)));
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

        const createdEvents = [];

        for (const event of formattedEvents) {
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
            continue;
          }

          const createdEvent = await res.json();
          createdEvents.push({
            id: createdEvent.id,
            title: createdEvent.title,
            start: new Date(createdEvent.start),
            end: new Date(createdEvent.end),
          });
        }

        setEvents([...events, ...createdEvents]);
      }
    } catch (error) {
      console.error("Error generating events:", error);
    } finally {
      setLoading(false);
    }
  };

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
      setSuggestionsLoading(true);
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
    } finally {
      setSuggestionsLoading(false);
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

      const createdEvent = await res.json();

      setEvents([
        ...events,
        {
          id: createdEvent.id,
          title: createdEvent.title,
          start: new Date(createdEvent.start),
          end: new Date(createdEvent.end),
        },
      ]);

      setSuggestedEvents(suggestedEvents.filter((e) => e.id !== event.id));
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };

  const handleRejectSuggestion = (eventId: string) => {
    setSuggestedEvents(suggestedEvents.filter((e) => e.id !== eventId));
  };

  useEffect(() => {
    if (!hasFetchedInitialSuggestions && userId) {
      fetchSuggestions();
      setHasFetchedInitialSuggestions(true);
    }
  }, [hasFetchedInitialSuggestions, userId]);

  useEffect(() => {
    if (extractedEvents.length > 0) {
      const saveEvents = async () => {
        const createdEvents: Event[] = [];

        for (const event of extractedEvents) {
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
            continue;
          }

          const createdEvent = await res.json();
          createdEvents.push({
            id: createdEvent.id,
            title: createdEvent.title,
            start: new Date(createdEvent.start),
            end: new Date(createdEvent.end),
          });
        }

        setEvents((prevEvents) => [...prevEvents, ...createdEvents]);
      };

      saveEvents();
    }
  }, [extractedEvents]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && selectedEventIds.size > 0) {
        handleBackspaceDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEventIds]);

  return (
    <SessionProvider>
      <div className="h-[92.25vh] flex flex-col bg-white">
        <div className="flex flex-1 h-full">
          {/* Goals Panel */}
          <GoalsPanel />
          {/* Calendar */}
          <div className="flex-1 p-4 h-full transition-all duration-200 relative dark:bg-dark-background dark:text-dark-textPrimary">
            <AnimatePresence>
              {calendarLoading && (
                <motion.div
                  className="absolute inset-0 flex flex-col justify-center items-center bg-white bg-opacity-70 backdrop-blur-sm z-10 dark:bg-dark-paper dark:bg-opacity-70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <RefreshCw
                    size={32}
                    className="animate-spin text-gray-600 dark:text-dark-textSecondary"
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
              dayCellClassNames="hover:bg-gray-100 transition-all duration-200 dark:hover:bg-dark-actionHover"
              dayHeaderClassNames="text-gray-700 font-semibold py-3 border-b dark:text-dark-textSecondary dark:border-dark-divider"
              nowIndicator={true}
              nowIndicatorClassNames="border-red-500 dark:border-red-900"
              scrollTimeReset={false}
              allDaySlot={false}
              scrollTime={`${new Date().getHours()}:00:00`}
              editable={true}
              selectable={true}
              eventResize={async (resizeInfo) => {
                try {
                  const updatedEvent = {
                    id: resizeInfo.event.id,
                    start: resizeInfo.event.start,
                    end: resizeInfo.event.end,
                  };

                  const res = await fetch(`/api/events/${updatedEvent.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedEvent),
                  });

                  if (!res.ok) {
                    throw new Error("Failed to update event duration");
                  }

                  console.log("Event resized and updated successfully");
                } catch (error) {
                  console.error("Error updating event duration:", error);
                  resizeInfo.revert();
                }
              }}
              eventDrop={handleEventDrop}
              datesSet={(dateInfo) => {
                const visibleStart = new Date(dateInfo.startStr);
                const visibleEnd = new Date(dateInfo.endStr);

                const bufferStart = new Date(visibleStart);
                bufferStart.setMonth(bufferStart.getMonth() - 2);

                const bufferEnd = new Date(visibleEnd);
                bufferEnd.setMonth(bufferEnd.getMonth() + 2);

                if (!isRangeInsideFetched(visibleStart, visibleEnd)) {
                  console.log(
                    "Fetching events for range:",
                    bufferStart,
                    bufferEnd
                  );
                  fetchEvents(
                    bufferStart.toISOString(),
                    bufferEnd.toISOString()
                  );
                  setFetchedRange({ start: bufferStart, end: bufferEnd });
                }
              }}
            />
          </div>

          {/* Side Panel */}
          <EventGenerationPanel
            inputText={inputText}
            setInputText={setInputText}
            loading={loading}
            handleSubmit={handleSubmit}
            suggestedEvents={suggestedEvents}
            handleAcceptSuggestion={handleAcceptSuggestion}
            handleRejectSuggestion={handleRejectSuggestion}
            suggestionsLoading={suggestionsLoading}
            setShowModal={setShowModal}
            setIsFileUploaderModalOpen={setIsFileUploaderModalOpen}
            fetchSuggestions={fetchSuggestions}
          />
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
          selectedCount={selectedEventIds.size}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setEventToDelete(null);
            setSelectedEventIds(new Set());
          }}
          onDelete={eventToDelete ? handleDelete : handleDeleteMany}
        />
        <FileUploaderModal
          isOpen={isFileUploaderModalOpen}
          onClose={() => setIsFileUploaderModalOpen(false)}
          setEvents={setExtractedEvents}
        />
      </div>
    </SessionProvider>
  );
}
