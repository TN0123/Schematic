"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import {
  EventClickArg,
  DateSelectArg,
  EventContentArg,
  EventChangeArg,
} from "@fullcalendar/core";
import { EventImpl } from "@fullcalendar/core/internal";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "tailwindcss/tailwind.css";
import EventCreationModal from "./_components/EventCreationModal";
import { DeleteEventModal } from "./_components/DeleteEventModal";
import { SessionProvider, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { RefreshCw, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EventGenerationPanel from "./_components/EventGenerationPanel";
import GoalsPanel from "./_components/GoalsPanel";
import FileUploaderModal from "./_components/FileUploaderModal";
import IcsUploaderModal from "./_components/IcsUploaderModal";
import EventEditModal from "./_components/EventEditModal";
import { useNextStep } from "nextstepjs";
import MobilePanelTabs from "./_components/MobilePanelTabs";

export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isSuggestion?: boolean;
}

interface GeneratedEvent {
  title: string;
  start: string;
  end: string;
}

const isSameDay = (d1: Date | null, d2: Date | null) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export default function CalendarApp() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/login");
    },
  });
  const userId = session?.user?.id;

  const [events, setEvents] = useState<Event[]>([]);
  const [showCreationModal, setShowCreationModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
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
  const [isIcsUploaderModalOpen, setIsIcsUploaderModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventImpl | null>(null);
  const [eventToEdit, setEventToEdit] = useState<EventImpl>();
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
  const [copiedEvents, setCopiedEvents] = useState<Event[]>([]);
  const [lastClickedDate, setLastClickedDate] = useState<Date | null>(null);
  const [dailySummary, setDailySummary] = useState("");
  const [dailySummaryDate, setDailySummaryDate] = useState<Date | null>(
    new Date()
  );
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const { startNextStep } = useNextStep();
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refreshIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
    const buttons = document.querySelectorAll(".fc-refresh-button");
    buttons.forEach((button) => {
      button.innerHTML = refreshIcon;
    });
  }, [suggestionsLoading]);

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
      setShowCreationModal(false);
      setNewEvent({ id: "", title: "", start: new Date(), end: new Date() });
    }
  };

  const handleEditEvent = async () => {
    console.log("Editing event:", eventToEdit);
    console.log("New event data:", newEvent);

    if (!eventToEdit) return;
    try {
      const res = await fetch(`/api/events/${eventToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvent.title,
          start: newEvent.start,
          end: newEvent.end,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update event");
      }

      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventToEdit.id
            ? {
                ...event,
                title: newEvent.title,
                start: newEvent.start,
                end: newEvent.end,
              }
            : event
        )
      );

      console.log("Event updated successfully");
      setNewEvent({ id: "", title: "", start: new Date(), end: new Date() });
      setShowEditModal(false);
    } catch (error) {
      console.error("Error editing event:", error);
    }
  };

  const handleEventUpdate = async (info: EventChangeArg) => {
    const { event } = info;
    const isSuggestion = event.extendedProps.isSuggestion;

    if (isSuggestion) {
      const suggestion = events.find((e) => e.id === event.id);
      if (!suggestion) {
        info.revert();
        return;
      }

      try {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: suggestion.title,
            start: event.start,
            end: event.end,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create event from suggestion");
        }
        const createdEvent = await res.json();
        setEvents((currentEvents) => [
          ...currentEvents.filter((e) => e.id !== event.id),
          {
            id: createdEvent.id,
            title: createdEvent.title,
            start: new Date(createdEvent.start),
            end: new Date(createdEvent.end),
            isSuggestion: false,
          },
        ]);
        console.log("Suggestion accepted and updated successfully");
      } catch (error) {
        console.error("Error handling suggestion update:", error);
        info.revert();
      }
    } else {
      // It's a regular event
      try {
        const res = await fetch(`/api/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: event.start,
            end: event.end,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to update event");
        }

        setEvents((prevEvents) =>
          prevEvents.map((e) =>
            e.id === event.id
              ? { ...e, start: event.start!, end: event.end! }
              : e
          )
        );
        console.log("Event updated successfully");
      } catch (error) {
        console.error("Error updating event:", error);
        info.revert();
      }
    }
  };

  const handleEventClick = (clickInfo: EventClickArg): void => {
    if (clickInfo.jsEvent.ctrlKey || clickInfo.jsEvent.metaKey) {
      setEventToDelete(clickInfo.event);
      setIsDeleteModalOpen(true);
    } else {
      setEventToEdit(clickInfo.event);
      setShowEditModal(true);
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
        setShowEditModal(false);
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  };

  const handleDeleteMany = async () => {
    const idsToDelete = Array.from(selectedEventIds);
    if (idsToDelete.length === 0) return;
    try {
      await fetch(`/api/events/bulk`, {
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

  const handleCopyEvents = () => {
    if (selectedEventIds.size > 0) {
      const eventsToCopy = events.filter((event) =>
        selectedEventIds.has(event.id)
      );
      setCopiedEvents(eventsToCopy);
      console.log(`Copied ${eventsToCopy.length} event(s)`);
    }
  };

  const handlePasteEvents = async () => {
    if (copiedEvents.length === 0) return;

    const targetDate = lastClickedDate || new Date();

    // Get current calendar view
    const currentView = calendarRef.current?.getApi().view.type;
    const isMonthView = currentView === "dayGridMonth";

    let eventsToCreate;

    if (isMonthView) {
      // In month view, preserve original times and only change the date
      eventsToCreate = copiedEvents.map((event) => {
        const originalStart = new Date(event.start);
        const originalEnd = new Date(event.end);

        // Create new dates with target date but original times
        const newStart = new Date(targetDate);
        newStart.setHours(
          originalStart.getHours(),
          originalStart.getMinutes(),
          originalStart.getSeconds(),
          originalStart.getMilliseconds()
        );

        const newEnd = new Date(targetDate);
        newEnd.setHours(
          originalEnd.getHours(),
          originalEnd.getMinutes(),
          originalEnd.getSeconds(),
          originalEnd.getMilliseconds()
        );

        // Handle events that span multiple days
        const originalDuration =
          originalEnd.getTime() - originalStart.getTime();
        if (originalDuration > 24 * 60 * 60 * 1000) {
          // More than 24 hours
          newEnd.setTime(newStart.getTime() + originalDuration);
        }

        return {
          title: event.title,
          start: newStart,
          end: newEnd,
        };
      });
    } else {
      // For week/day views, use the existing relative positioning logic
      const firstCopiedEvent = copiedEvents[0];
      const originalStart = new Date(firstCopiedEvent.start);
      const timeDifference = targetDate.getTime() - originalStart.getTime();

      eventsToCreate = copiedEvents.map((event) => {
        const newStart = new Date(
          new Date(event.start).getTime() + timeDifference
        );
        const newEnd = new Date(new Date(event.end).getTime() + timeDifference);

        return {
          title: event.title,
          start: newStart,
          end: newEnd,
        };
      });
    }

    try {
      const res = await fetch("/api/events/bulkAdd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events: eventsToCreate }),
      });

      if (!res.ok) {
        throw new Error("Failed to paste events");
      }

      const responseData = await res.json();
      console.log("API Response:", responseData); // Debug log

      // Handle different possible response structures
      const createdEventsArray = Array.isArray(responseData)
        ? responseData
        : responseData.events || responseData.data || [];

      let formattedEvents: Event[];

      if (
        Array.isArray(createdEventsArray) &&
        createdEventsArray.length > 0 &&
        createdEventsArray[0].id
      ) {
        // API returned events with IDs - use them
        formattedEvents = createdEventsArray.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
      } else {
        // API didn't return proper events - generate temporary IDs and refetch
        console.log(
          "API didn't return events with IDs, generating temporary IDs"
        );
        formattedEvents = eventsToCreate.map((event, index) => ({
          id: `temp-${Date.now()}-${index}`,
          title: event.title,
          start: event.start,
          end: event.end,
        }));

        // Refetch events to get the actual data from the database
        setTimeout(() => {
          if (fetchedRange) {
            fetchEvents(
              fetchedRange.start.toISOString(),
              fetchedRange.end.toISOString()
            );
          }
        }, 100);
      }

      setEvents((prevEvents) => [...prevEvents, ...formattedEvents]);
      console.log(
        `Pasted ${formattedEvents.length} event(s) in ${currentView} view`
      );

      // Clear selection and set new selection to pasted events
      setSelectedEventIds(new Set(formattedEvents.map((e: Event) => e.id)));
    } catch (error) {
      console.error("Error pasting events:", error);
    }
  };

  const handleSelect = (selectInfo: DateSelectArg) => {
    console.log("Called!");
    const selectedStart = new Date(selectInfo.start);
    const selectedEnd = new Date(selectInfo.end);

    // Track the last clicked date for pasting
    setLastClickedDate(selectedStart);

    const eventsInRange = events.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart < selectedEnd && eventEnd > selectedStart;
    });

    setSelectedEventIds(new Set(eventsInRange.map((e) => e.id)));
  };

  const handleUnselect = () => {
    setSelectedEventIds(new Set());
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        const res = await fetch("/api/events/bulkAdd", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ events: formattedEvents }),
        });

        if (!res.ok) {
          throw new Error("Failed to save events to database");
        }

        const createdEventsWithIds = await res.json();

        const newEvents = createdEventsWithIds.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        setEvents((prevEvents) => [...prevEvents, ...newEvents]);
        setInputText("");
      }
    } catch (error) {
      console.error("Error generating events:", error);
    } finally {
      setLoading(false);
    }
  };

  const todaysEvents = useMemo(() => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    return events
      .filter((event) => !event.isSuggestion)
      .filter((event) => {
        const eventStart = new Date(event.start);
        return eventStart >= currentDate && eventStart <= endOfDay;
      });
  }, [events]);

  useEffect(() => {
    const fetchDailySummary = async (date: Date) => {
      setDailySummaryLoading(true);
      try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const eventsForDay = events
          .filter((event) => !event.isSuggestion)
          .filter((event) => {
            const eventStart = new Date(event.start);
            return eventStart >= startOfDay && eventStart <= endOfDay;
          });

        if (eventsForDay.length === 0) {
          setDailySummary("No events scheduled for this day.");
          return;
        }

        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const eventSummary = eventsForDay
          .map((event) => {
            const options: Intl.DateTimeFormatOptions = {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
              timeZone: userTimezone,
            };
            const start = new Date(event.start).toLocaleTimeString(
              "en-US",
              options
            );
            const end = new Date(event.end).toLocaleTimeString(
              "en-US",
              options
            );
            return `${event.title}: ${start} - ${end}`;
          })
          .join("\n");

        const response = await fetch("/api/daily-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            existingEvents: eventsForDay,
            timezone: userTimezone,
            userId: userId,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch daily summary");
        }
        const data = await response.json();
        setDailySummary(`${eventSummary}ADVICE${data.result}`);
      } catch (error) {
        console.error("Error fetching daily summary:", error);
        setDailySummary("Could not load summary.");
      } finally {
        setDailySummaryLoading(false);
      }
    };
    if (dailySummaryDate && userId) {
      fetchDailySummary(dailySummaryDate);
    } else {
      setDailySummary("");
    }
  }, [dailySummaryDate, userId, events]);

  const fetchSuggestions = async () => {
    if (!userId) {
      console.error("unable to get userId");
      return;
    }

    try {
      setSuggestionsLoading(true);

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eventSummary = todaysEvents
        .map((event) => {
          const options: Intl.DateTimeFormatOptions = {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
            timeZone: userTimezone,
          };
          const start = new Date(event.start).toLocaleTimeString(
            "en-US",
            options
          );
          const end = new Date(event.end).toLocaleTimeString("en-US", options);
          return `${event.title}: ${start} - ${end}`;
        })
        .join("\n");

      const response = await fetch(`/api/generate-events/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          existingEvents: todaysEvents,
          eventSummary: eventSummary,
          userId: userId,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch suggestions");

      const data = await response.json();
      if (data.events) {
        const newSuggestions = data.events.map((event: any) => ({
          id: event.id || `suggestion-${Date.now()}-${Math.random()}`,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
          isSuggestion: true,
        }));
        setEvents((currentEvents) => [
          ...currentEvents.filter((e) => !e.isSuggestion),
          ...newSuggestions,
        ]);
      }
    } catch (error) {
      console.error("Error suggesting events:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    const suggestion = events.find((e) => e.id === suggestionId);
    if (!suggestion) return;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: suggestion.title,
          start: suggestion.start,
          end: suggestion.end,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add suggested event");
      }

      const createdEvent = await res.json();

      setEvents((currentEvents) =>
        currentEvents.map((e) =>
          e.id === suggestionId
            ? {
                id: createdEvent.id,
                title: createdEvent.title,
                start: new Date(createdEvent.start),
                end: new Date(createdEvent.end),
                isSuggestion: false,
              }
            : e
        )
      );
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    setEvents((currentEvents) =>
      currentEvents.filter((e) => e.id !== suggestionId)
    );
  };

  useEffect(() => {
    async function checkAndStartTour() {
      try {
        const res = await fetch("/api/user/onboarding-status");
        const data = await res.json();

        if (!data.hasCompletedScheduleTour) {
          startNextStep("scheduleTour");
        }
      } catch (error) {
        console.error("Failed to fetch onboarding status:", error);
      }
    }

    checkAndStartTour();
  }, [startNextStep]);

  useEffect(() => {
    if (!hasFetchedInitialSuggestions && userId) {
      fetchSuggestions();
      setHasFetchedInitialSuggestions(true);
    }
  }, [hasFetchedInitialSuggestions, userId]);

  useEffect(() => {
    if (extractedEvents.length > 0) {
      const saveEvents = async () => {
        try {
          const res = await fetch("/api/events/bulkAdd", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ events: extractedEvents }),
          });

          if (!res.ok) {
            throw new Error("Failed to save events to database");
          }

          const createdEvents = extractedEvents.map((event, index) => ({
            ...event,
            id: `${Date.now()}-${index}`,
          }));

          setEvents((prevEvents) => [...prevEvents, ...createdEvents]);
        } catch (error) {
          console.error("Error saving events:", error);
        }
      };

      saveEvents();
    }
  }, [extractedEvents]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && selectedEventIds.size > 0) {
        handleBackspaceDelete();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        selectedEventIds.size > 0
      ) {
        e.preventDefault();
        handleCopyEvents();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "v" &&
        copiedEvents.length > 0
      ) {
        e.preventDefault();
        handlePasteEvents();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEventIds, copiedEvents]);

  useEffect(() => {
    if (eventToEdit) {
      setNewEvent({
        id: eventToEdit.id,
        title: eventToEdit.title,
        start: eventToEdit.start!,
        end: eventToEdit.end!,
      });
      setEventToDelete(eventToEdit);
    }
  }, [eventToEdit]);

  useEffect(() => {
    if (!calendarContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (calendarRef.current) {
        const timeoutId = setTimeout(() => {
          calendarRef.current?.getApi().updateSize();
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    });

    resizeObserver.observe(calendarContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  function renderEventContent(eventInfo: EventContentArg) {
    const isSuggestion = eventInfo.event.extendedProps.isSuggestion;
    const eventTitle = eventInfo.event.title;

    const tooltip = (
      <div className="absolute bottom-full left-1/2 z-50 mb-2 w-max -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none dark:bg-gray-700">
        {eventTitle}
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-b-0 border-solid border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    );

    const baseContainerClasses = "group relative h-full w-full p-1";
    const titleClasses = "font-normal truncate";

    if (isSuggestion) {
      return (
        <div
          className={`${baseContainerClasses} flex items-center justify-between`}
        >
          <div className={`${titleClasses} text-xs pr-1`}>{eventTitle}</div>
          {tooltip}
          <div className="flex shrink-0 items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptSuggestion(eventInfo.event.id);
              }}
              className="bg-green-500 hover:bg-green-600 text-white p-0.5 rounded-full flex items-center justify-center"
              style={{ width: "16px", height: "16px" }}
              aria-label="Accept suggestion"
            >
              <Check size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRejectSuggestion(eventInfo.event.id);
              }}
              className="bg-red-500 hover:bg-red-600 text-white p-0.5 rounded-full flex items-center justify-center"
              style={{ width: "16px", height: "16px" }}
              aria-label="Reject suggestion"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`${baseContainerClasses} flex flex-col justify-start`}>
        <div className={titleClasses}>{eventTitle}</div>
        {tooltip}
      </div>
    );
  }

  return (
    <SessionProvider>
      <div className="h-screen w-full flex flex-col bg-white dark:bg-dark-background">
        {/* Desktop Layout */}
        <div className="hidden md:flex md:flex-row h-full">
          {/* Goals Panel */}
          <GoalsPanel />
          {/* Calendar */}
          <div
            ref={calendarContainerRef}
            className="flex-1 justify-center items-center p-2 md:p-4 h-full transition-all duration-200 relative dark:bg-dark-background dark:text-dark-textPrimary"
          >
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
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              events={events}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="100%"
              customButtons={{
                refresh: {
                  text: "",
                  click: fetchSuggestions,
                  hint: "Refresh Suggestions",
                },
              }}
              eventClassNames={(eventInfo) => {
                const isSuggestion = eventInfo.event.extendedProps.isSuggestion;
                const isCopied = copiedEvents.some(
                  (e) => e.id === eventInfo.event.id
                );
                const isSelected = selectedEventIds.has(eventInfo.event.id);

                if (!isSuggestion && isCopied) {
                  const copiedClasses = [
                    "opacity-60",
                    "border-2",
                    "border-dashed",
                    "border-blue-400",
                    "rounded-md",
                  ];
                  if (isSelected) {
                    copiedClasses.push("ring-2", "ring-blue-500");
                  }
                  return copiedClasses;
                }

                const classes = [
                  "dark:bg-blue-900/80",
                  "dark:border-blue-500",
                  "border-l-4",
                  "text-white dark:text-blue-200",
                  "rounded-md",
                  "border-transparent",
                  "overflow-visible",
                ];

                if (isSuggestion) {
                  classes.push("opacity-70");
                }

                if (isSelected) {
                  classes.push("ring-2", "ring-blue-500");
                }
                return classes.filter(Boolean);
              }}
              headerToolbar={{
                start: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay,refresh",
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
              select={handleSelect}
              unselect={handleUnselect}
              unselectAuto={true}
              selectable={true}
              dateClick={(clickInfo) => {
                const clickedDate = new Date(clickInfo.date);
                if (!isSameDay(clickedDate, dailySummaryDate)) {
                  setDailySummaryDate(clickedDate);
                }
                setLastClickedDate(new Date(clickInfo.date));
              }}
              eventResize={handleEventUpdate}
              eventDrop={handleEventUpdate}
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
            setShowModal={setShowCreationModal}
            setIsFileUploaderModalOpen={setIsFileUploaderModalOpen}
            setIsIcsUploaderModalOpen={setIsIcsUploaderModalOpen}
            dailySummary={dailySummary}
            dailySummaryDate={dailySummaryDate}
            dailySummaryLoading={dailySummaryLoading}
          />
        </div>

        {/* Mobile Layout */}
        <div className="flex md:hidden flex-col h-full">
          {/* Calendar Section - Top */}
          <div
            ref={calendarContainerRef}
            className="flex-1 justify-center items-center p-2 h-2/3 transition-all duration-200 relative dark:bg-dark-background dark:text-dark-textPrimary"
          >
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
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridDay"
              events={events}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="100%"
              customButtons={{
                refresh: {
                  text: "",
                  click: fetchSuggestions,
                },
              }}
              headerToolbar={{
                start: "title",
                center: "",
                end: "prev,next",
              }}
              footerToolbar={{
                start: "today",
                center: "dayGridMonth,timeGridWeek,timeGridDay",
                end: "refresh",
              }}
              eventClassNames={(eventInfo) => {
                const isSuggestion = eventInfo.event.extendedProps.isSuggestion;
                const isCopied = copiedEvents.some(
                  (e) => e.id === eventInfo.event.id
                );
                const isSelected = selectedEventIds.has(eventInfo.event.id);

                if (!isSuggestion && isCopied) {
                  const copiedClasses = [
                    "opacity-60",
                    "border-2",
                    "border-dashed",
                    "border-blue-400",
                    "rounded-md",
                    "text-xs",
                  ];
                  if (isSelected) {
                    copiedClasses.push("ring-2", "ring-blue-500");
                  }
                  return copiedClasses;
                }

                const classes = [
                  "dark:bg-blue-900/80",
                  "dark:border-blue-500",
                  "border-l-4",
                  "text-white dark:text-blue-200",
                  "rounded-md",
                  "border-transparent",
                  "overflow-visible",
                  "text-xs",
                ];

                if (isSuggestion) {
                  classes.push("opacity-70");
                }

                if (isSelected) {
                  classes.push("ring-2", "ring-blue-500");
                }
                return classes.filter(Boolean);
              }}
              buttonText={{
                today: "Today",
                month: "M",
                week: "W",
                day: "D",
              }}
              dayMaxEventRows={2}
              views={{
                dayGridMonth: {
                  titleFormat: { year: "numeric", month: "long" },
                  dayHeaderFormat: { weekday: "narrow" },
                },
              }}
              themeSystem="standard"
              dayCellClassNames="hover:bg-gray-100 transition-all duration-200 dark:hover:bg-dark-actionHover"
              dayHeaderClassNames="text-gray-600 font-medium py-2 border-b dark:text-dark-textSecondary dark:border-dark-divider text-xs"
              nowIndicator={true}
              nowIndicatorClassNames="border-red-500 dark:border-red-900"
              scrollTimeReset={false}
              scrollTime={`${new Date().getHours()}:00:00`}
              allDaySlot={false}
              editable={true}
              select={handleSelect}
              unselect={handleUnselect}
              unselectAuto={true}
              selectable={true}
              dateClick={(clickInfo) => {
                const clickedDate = new Date(clickInfo.date);
                if (!isSameDay(clickedDate, dailySummaryDate)) {
                  setDailySummaryDate(clickedDate);
                }
                setLastClickedDate(new Date(clickInfo.date));
              }}
              eventResize={handleEventUpdate}
              eventDrop={handleEventUpdate}
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

          {/* Bottom Panel Section - Mobile */}
          <div className="h-1/3 bg-white dark:bg-dark-background border-t dark:border-dark-divider">
            <MobilePanelTabs
              inputText={inputText}
              setInputText={setInputText}
              loading={loading}
              handleSubmit={handleSubmit}
              setShowModal={setShowCreationModal}
              setIsFileUploaderModalOpen={setIsFileUploaderModalOpen}
              setIsIcsUploaderModalOpen={setIsIcsUploaderModalOpen}
              dailySummary={dailySummary}
              dailySummaryDate={dailySummaryDate}
              dailySummaryLoading={dailySummaryLoading}
            />
          </div>
        </div>

        {showCreationModal && (
          <EventCreationModal
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            setShowModal={setShowCreationModal}
            handleAddEvent={handleAddEvent}
          />
        )}

        {showEditModal && (
          <EventEditModal
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            onClose={() => {
              setShowEditModal(false);
              setNewEvent({
                id: "",
                title: "",
                start: new Date(),
                end: new Date(),
              });
            }}
            handleEditEvent={handleEditEvent}
            handleDeleteEvent={handleDelete}
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
        <IcsUploaderModal
          isOpen={isIcsUploaderModalOpen}
          onClose={() => setIsIcsUploaderModalOpen(false)}
          setEvents={setExtractedEvents}
        />
      </div>
    </SessionProvider>
  );
}
