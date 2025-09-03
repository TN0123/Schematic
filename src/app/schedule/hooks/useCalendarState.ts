import { useState, useEffect, useCallback, useMemo } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import {
  EventChangeArg,
  DateSelectArg,
  EventClickArg,
} from "@fullcalendar/core";
import { Event, NewEvent } from "../types";
import { Reminder } from "../_components/RemindersBar";
import { isSameDay, isRangeInsideFetched } from "../utils/calendarHelpers";

export const useCalendarState = (
  events: Event[],
  reminders: Reminder[],
  fetchEvents: (startStr: string, endStr: string) => Promise<void>,
  fetchedRange: { start: Date; end: Date } | null,
  setFetchedRange: (range: { start: Date; end: Date } | null) => void,
  editEvent: (
    eventId: string,
    eventData: { title: string; start: Date; end: Date; links?: string[] }
  ) => Promise<void>,
  addEvent: (eventData: {
    title: string;
    start: Date;
    end: Date;
    links?: string[];
  }) => Promise<Event>,
  acceptSuggestion: (suggestionId: string) => Promise<void>
) => {
  // Modal states
  const [showCreationModal, setShowCreationModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFileUploaderModalOpen, setIsFileUploaderModalOpen] = useState(false);
  const [isIcsUploaderModalOpen, setIsIcsUploaderModalOpen] = useState(false);

  // Event editing states
  const [newEvent, setNewEvent] = useState<NewEvent>({
    id: "",
    title: "",
    start: new Date(),
    end: new Date(),
    links: [],
  });
  const [eventToDelete, setEventToDelete] = useState<EventImpl | null>(null);
  const [eventToEdit, setEventToEdit] = useState<EventImpl>();

  // Loading states
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Selection and interaction states
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set()
  );
  const [copiedEvents, setCopiedEvents] = useState<Event[]>([]);
  const [lastClickedDate, setLastClickedDate] = useState<Date | null>(null);
  const [extractedEvents, setExtractedEvents] = useState<Event[]>([]);

  // Daily summary states
  const [dailySummary, setDailySummary] = useState("");
  const [dailySummaryDate, setDailySummaryDate] = useState<Date | null>(
    new Date()
  );
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);

  // Reminders UI states
  const [showReminders, setShowReminders] = useState(false);
  const [showCalendarHeader, setShowCalendarHeader] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Modal tabs
  const [modalInitialTab, setModalInitialTab] = useState<"event" | "reminder">(
    "event"
  );

  // Initialize suggestions state
  const [hasFetchedInitialSuggestions, setHasFetchedInitialSuggestions] =
    useState(false);

  // Computed values
  const unreadReminders = useMemo(() => {
    return reminders.filter((r) => !r.isRead);
  }, [reminders]);

  const unreadNonAIReminders = useMemo(() => {
    return reminders.filter((r) => !r.isRead && !r.isAISuggested);
  }, [reminders]);

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

  // Handle reminders bar toggle
  const handleToggleReminders = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    if (showReminders) {
      setShowReminders(false);
      setShowCalendarHeader(true);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 350);
    } else {
      setShowCalendarHeader(false);
      setShowReminders(true);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 350);
    }
  }, [isTransitioning, showReminders]);

  // Handle calendar event updates (drag and drop)
  const handleEventUpdate = useCallback(
    async (info: EventChangeArg) => {
      const { event } = info;
      const isSuggestion = event.extendedProps.isSuggestion;

      if (isSuggestion) {
        const suggestion = events.find((e) => e.id === event.id);
        if (!suggestion) {
          info.revert();
          return;
        }

        try {
          await acceptSuggestion(event.id);
          console.log("Suggestion accepted and updated successfully");
        } catch (error) {
          console.error("Error handling suggestion update:", error);
          info.revert();
        }
      } else {
        try {
          await editEvent(event.id, {
            title: event.title,
            start: event.start!,
            end: event.end!,
            links: Array.isArray(event.extendedProps.links)
              ? (event.extendedProps.links as string[])
              : undefined,
          });
          console.log("Event updated successfully");
        } catch (error) {
          console.error("Error updating event:", error);
          info.revert();
        }
      }
    },
    [events, acceptSuggestion, editEvent]
  );

  // Handle event clicks
  const handleEventClick = useCallback((clickInfo: EventClickArg): void => {
    const isSuggestion = clickInfo.event.extendedProps.isSuggestion;

    if (clickInfo.jsEvent.ctrlKey || clickInfo.jsEvent.metaKey) {
      if (!isSuggestion) {
        setEventToDelete(clickInfo.event);
        setIsDeleteModalOpen(true);
      }
    } else {
      if (!isSuggestion) {
        setEventToEdit(clickInfo.event);
        setShowEditModal(true);
      }
    }
  }, []);

  // Handle date selection
  const handleSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      const selectedStart = new Date(selectInfo.start);
      const selectedEnd = new Date(selectInfo.end);

      setLastClickedDate(selectedStart);

      const eventsInRange = events.filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return eventStart < selectedEnd && eventEnd > selectedStart;
      });

      setSelectedEventIds(new Set(eventsInRange.map((e) => e.id)));
    },
    [events]
  );

  // Handle unselect
  const handleUnselect = useCallback(() => {
    setSelectedEventIds(new Set());
  }, []);

  // Handle keyboard shortcuts
  const handleBackspaceDelete = useCallback(() => {
    if (selectedEventIds.size > 0) {
      setEventToDelete(null);
      setIsDeleteModalOpen(true);
    }
  }, [selectedEventIds]);

  const handleCopyEvents = useCallback(() => {
    if (selectedEventIds.size > 0) {
      const eventsToCopy = events.filter((event) =>
        selectedEventIds.has(event.id)
      );
      setCopiedEvents(eventsToCopy);
      console.log(`Copied ${eventsToCopy.length} event(s)`);
    }
  }, [selectedEventIds, events]);

  const handlePasteEvents = useCallback(
    async (
      bulkAddEvents: (
        events: Array<{
          title: string;
          start: Date;
          end: Date;
          links?: string[];
        }>
      ) => Promise<Event[]>
    ) => {
      if (copiedEvents.length === 0) return;

      const targetDate = lastClickedDate || new Date();

      // Determine the paste behavior based on view (simplified logic)
      const firstCopiedEvent = copiedEvents[0];
      const originalStart = new Date(firstCopiedEvent.start);
      const timeDifference = targetDate.getTime() - originalStart.getTime();

      const eventsToCreate = copiedEvents.map((event) => {
        const newStart = new Date(
          new Date(event.start).getTime() + timeDifference
        );
        const newEnd = new Date(new Date(event.end).getTime() + timeDifference);

        return {
          title: event.title,
          start: newStart,
          end: newEnd,
          links: Array.isArray(event.links) ? event.links : undefined,
        };
      });

      try {
        const formattedEvents = await bulkAddEvents(eventsToCreate);
        console.log(`Pasted ${formattedEvents.length} event(s)`);
        setSelectedEventIds(new Set(formattedEvents.map((e: Event) => e.id)));
      } catch (error) {
        console.error("Error pasting events:", error);
      }
    },
    [copiedEvents, lastClickedDate]
  );

  // Handle date range changes (for fetching events)
  const handleDatesSet = useCallback(
    (dateInfo: any) => {
      const visibleStart = new Date(dateInfo.startStr);
      const visibleEnd = new Date(dateInfo.endStr);

      const bufferStart = new Date(visibleStart);
      bufferStart.setMonth(bufferStart.getMonth() - 2);

      const bufferEnd = new Date(visibleEnd);
      bufferEnd.setMonth(bufferEnd.getMonth() + 2);

      if (!isRangeInsideFetched(visibleStart, visibleEnd, fetchedRange)) {
        console.log("Fetching events for range:", bufferStart, bufferEnd);
        fetchEvents(bufferStart.toISOString(), bufferEnd.toISOString());
        setFetchedRange({ start: bufferStart, end: bufferEnd });
      }
    },
    [fetchEvents, fetchedRange, setFetchedRange]
  );

  // Handle date clicks
  const handleDateClick = useCallback(
    (clickInfo: any) => {
      const clickedDate = new Date(clickInfo.date);
      if (!isSameDay(clickedDate, dailySummaryDate)) {
        setDailySummaryDate(clickedDate);
      }
      setLastClickedDate(new Date(clickInfo.date));
    },
    [dailySummaryDate]
  );

  // Set up event editing when eventToEdit changes
  useEffect(() => {
    if (eventToEdit) {
      setNewEvent({
        id: eventToEdit.id,
        title: eventToEdit.title,
        start: eventToEdit.start!,
        end: eventToEdit.end!,
        links: Array.isArray(eventToEdit.extendedProps.links)
          ? (eventToEdit.extendedProps.links as string[])
          : [],
      });
      setEventToDelete(eventToEdit);
    }
  }, [eventToEdit]);

  // Set up keyboard event listeners
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
        // Note: handlePasteEvents needs bulkAddEvents function, so it should be called from parent
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEventIds, copiedEvents, handleBackspaceDelete, handleCopyEvents]);

  return {
    // Modal states
    showCreationModal,
    setShowCreationModal,
    showEditModal,
    setShowEditModal,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isFileUploaderModalOpen,
    setIsFileUploaderModalOpen,
    isIcsUploaderModalOpen,
    setIsIcsUploaderModalOpen,

    // Event editing states
    newEvent,
    setNewEvent,
    eventToDelete,
    setEventToDelete,
    eventToEdit,
    setEventToEdit,

    // Loading states
    loading,
    setLoading,
    suggestionsLoading,
    setSuggestionsLoading,

    // Selection and interaction states
    selectedEventIds,
    setSelectedEventIds,
    copiedEvents,
    setCopiedEvents,
    lastClickedDate,
    setLastClickedDate,
    extractedEvents,
    setExtractedEvents,

    // Daily summary states
    dailySummary,
    setDailySummary,
    dailySummaryDate,
    setDailySummaryDate,
    dailySummaryLoading,
    setDailySummaryLoading,

    // Reminders UI states
    showReminders,
    setShowReminders,
    showCalendarHeader,
    setShowCalendarHeader,
    isTransitioning,
    setIsTransitioning,

    // Modal tabs
    modalInitialTab,
    setModalInitialTab,

    // Initialization states
    hasFetchedInitialSuggestions,
    setHasFetchedInitialSuggestions,

    // Computed values
    unreadReminders,
    unreadNonAIReminders,
    todaysEvents,

    // Event handlers
    handleToggleReminders,
    handleEventUpdate,
    handleEventClick,
    handleSelect,
    handleUnselect,
    handleBackspaceDelete,
    handleCopyEvents,
    handlePasteEvents,
    handleDatesSet,
    handleDateClick,
  };
};
