import { useState, useEffect, useCallback } from "react";
import { Event, GeneratedEvent, GenerationResult } from "../types";
import { Reminder } from "../_components/RemindersBar";
import {
  getUserTimezone,
  formatDateForDisplay,
  formatTimeForDisplay,
  isSameDay,
} from "../utils/calendarHelpers";

export const useCalendarData = (
  userId: string | undefined,
  refreshDailySummary?: () => void
) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [fetchedRange, setFetchedRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [suggestionsRefreshTrigger, setSuggestionsRefreshTrigger] = useState(0);

  const maybeRefreshSuggestionsForToday = useCallback((date: Date) => {
    const now = new Date();
    if (isSameDay(now, date)) {
      setSuggestionsRefreshTrigger((n) => n + 1);
    }
  }, []);

  // Fetch events from API
  const fetchEvents = useCallback(async (startStr: string, endStr: string) => {
    setCalendarLoading(true);
    try {
      const response = await fetch(
        `/api/events?start=${startStr}&end=${endStr}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await response.json();
      const formatted = data.map((e: any) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        links: Array.isArray(e.links) ? e.links : undefined,
      }));
      setEvents(formatted);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  // Fetch reminders from database
  const fetchReminders = useCallback(async () => {
    try {
      const response = await fetch("/api/reminders");
      if (!response.ok) {
        throw new Error("Failed to fetch reminders");
      }
      const data = await response.json();
      const formattedReminders = data.map((reminder: any) => ({
        ...reminder,
        time: new Date(reminder.time),
      }));
      setReminders(formattedReminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  }, []);

  // Add single event
  const addEvent = useCallback(
    async (eventData: { title: string; start: Date; end: Date; links?: string[] }) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...eventData,
          start: eventData.start,
          end: eventData.end,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to add event");
      }

      const createdEvent = await res.json();
      const newEvent: Event = {
        id: createdEvent.id,
        title: createdEvent.title,
        start: new Date(createdEvent.start),
        end: new Date(createdEvent.end),
        links: Array.isArray(createdEvent.links) ? createdEvent.links : undefined,
      };

      setEvents((prev) => [...prev, newEvent]);

      // Refresh daily summary when event is added
      if (refreshDailySummary) {
        refreshDailySummary();
      }

      // Refresh suggestions if event is for today
      maybeRefreshSuggestionsForToday(newEvent.start);

      return newEvent;
    },
    [refreshDailySummary, maybeRefreshSuggestionsForToday]
  );

  // Edit event
  const editEvent = useCallback(
    async (
      eventId: string,
      eventData: {
        title: string;
        start: Date;
        end: Date;
        links?: string[];
      }
    ) => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        throw new Error("Failed to update event");
      }

      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId ? { ...event, ...eventData } : event
        )
      );

      // Refresh daily summary when event is edited
      if (refreshDailySummary) {
        refreshDailySummary();
      }

      // Refresh suggestions if event is for today
      maybeRefreshSuggestionsForToday(eventData.start);
    },
    [refreshDailySummary, maybeRefreshSuggestionsForToday]
  );

  // Delete event
  const deleteEvent = useCallback(
    async (eventId: string) => {
      // Determine if deleted event was today
      const toDelete = events.find((e) => e.id === eventId);
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete event");
      }
      setEvents((prev) => prev.filter((event) => event.id !== eventId));

      // Refresh daily summary when event is deleted
      if (refreshDailySummary) {
        refreshDailySummary();
      }

      // Refresh suggestions if deleted event was today
      if (toDelete) {
        maybeRefreshSuggestionsForToday(new Date(toDelete.start));
      }
    },
    [events, refreshDailySummary, maybeRefreshSuggestionsForToday]
  );

  // Delete multiple events
  const deleteMultipleEvents = useCallback(
    async (eventIds: string[]) => {
      const toDeleteToday = events.some((e) =>
        eventIds.includes(e.id) && isSameDay(new Date(e.start), new Date())
      );
      await fetch(`/api/events/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: eventIds }),
      });
      setEvents((prev) => prev.filter((e) => !eventIds.includes(e.id)));

      // Refresh daily summary when events are deleted
      if (refreshDailySummary && eventIds.length > 0) {
        refreshDailySummary();
      }

      if (toDeleteToday) {
        setSuggestionsRefreshTrigger((n) => n + 1);
      }
    },
    [events, refreshDailySummary]
  );

  // Bulk add events
  const bulkAddEvents = useCallback(
    async (
      eventsToCreate: Array<{
        title: string;
        start: Date;
        end: Date;
        links?: string[];
      }>
    ) => {
      const res = await fetch("/api/events/bulkAdd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events: eventsToCreate }),
      });

      if (!res.ok) {
        throw new Error("Failed to save events to database");
      }

      const responseData = await res.json();
      const createdEventsArray = Array.isArray(responseData)
        ? responseData
        : responseData.events || responseData.data || [];

      let formattedEvents: Event[];

      if (
        Array.isArray(createdEventsArray) &&
        createdEventsArray.length > 0 &&
        createdEventsArray[0].id
      ) {
        formattedEvents = createdEventsArray.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
          links: Array.isArray(event.links) ? event.links : undefined,
        }));
      } else {
        formattedEvents = eventsToCreate.map((event, index) => ({
          id: `temp-${Date.now()}-${index}`,
          title: event.title,
          start: event.start,
          end: event.end,
          links: Array.isArray(event.links) ? event.links : undefined,
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

      // Refresh daily summary when events are bulk added
      if (refreshDailySummary && formattedEvents.length > 0) {
        refreshDailySummary();
      }

      // Refresh suggestions if any of the added events are for today
      if (
        formattedEvents.some((e) => isSameDay(new Date(), new Date(e.start)))
      ) {
        setSuggestionsRefreshTrigger((n) => n + 1);
      }

      return formattedEvents;
    },
    [fetchEvents, fetchedRange, refreshDailySummary]
  );

  // Generate events and reminders
  const generateEventsAndReminders = useCallback(
    async (inputText: string): Promise<GenerationResult | null> => {
      if (!inputText.trim() || !userId) return null;

      try {
        const userTimezone = getUserTimezone();
        const response = await fetch("/api/generate-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: inputText,
            timezone: userTimezone,
            userId: userId,
          }),
        });
        const data = await response.json();

        let eventsAdded = 0;
        let remindersAdded = 0;
        const resultEvents: Array<{
          title: string;
          date: string;
          time?: string;
        }> = [];
        const resultReminders: Array<{
          title: string;
          date: string;
          time?: string;
        }> = [];

        // Handle events
        if (data.events && data.events.length > 0) {
          const formattedEvents = data.events.map((event: GeneratedEvent) => ({
            title: event.title,
            start: new Date(event.start),
            end: new Date(event.end),
          }));

          const createdEvents = await bulkAddEvents(formattedEvents);
          eventsAdded = createdEvents.length;

          // Populate result events for display
          createdEvents.forEach((event: Event) => {
            const eventStart = new Date(event.start);
            resultEvents.push({
              title: event.title,
              date: formatDateForDisplay(eventStart),
              time: formatTimeForDisplay(eventStart),
            });
          });
        }

        // Handle reminders
        if (data.reminders && data.reminders.length > 0) {
          const formattedReminders = data.reminders.map((reminder: any) => ({
            ...reminder,
            time: new Date(reminder.time),
          }));

          // Replace AI-suggested reminders while keeping user-created ones
          setReminders((prev) => [
            ...prev.filter((r) => !r.isAISuggested),
            ...formattedReminders,
          ]);

          remindersAdded = formattedReminders.length;

          // Populate result reminders for display
          formattedReminders.forEach((reminder: any) => {
            const reminderTime = new Date(reminder.time);
            resultReminders.push({
              title: reminder.title,
              date: formatDateForDisplay(reminderTime),
              time: formatTimeForDisplay(reminderTime),
            });
          });
        }

        return {
          eventsCount: eventsAdded,
          remindersCount: remindersAdded,
          events: resultEvents,
          reminders: resultReminders,
        };
      } catch (error) {
        console.error("Error generating events:", error);
        return null;
      }
    },
    [userId, bulkAddEvents]
  );

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (force?: boolean) => {
    if (!userId) {
      console.error("unable to get userId");
      return;
    }

    try {
      const userTimezone = getUserTimezone();

      const response = await fetch(`/api/generate-events/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          timezone: userTimezone,
          force: !!force,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch suggestions");

      const data = await response.json();

      // Handle suggested events
      if (data.events && data.events.length > 0) {
        const newSuggestions = data.events.map((event: any) => ({
          id: event.id || `suggestion-${Date.now()}-${Math.random()}`,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
          isSuggestion: true,
          links: Array.isArray(event.links) ? event.links : undefined,
        }));
        setEvents((currentEvents) => [
          ...currentEvents.filter((e) => !e.isSuggestion),
          ...newSuggestions,
        ]);
      }

      // Handle suggested reminders
      if (data.reminders && data.reminders.length > 0) {
        const formattedReminders = data.reminders.map((reminder: any) => ({
          ...reminder,
          time: new Date(reminder.time),
        }));
        // Replace AI-suggested reminders while keeping user-created ones
        setReminders((prev) => [
          ...prev.filter((r) => !r.isAISuggested),
          ...formattedReminders,
        ]);
      }
    } catch (error) {
      console.error("Error suggesting events and reminders:", error);
    }
  }, [userId]);

  // Refresh suggestions when triggered by event changes affecting today
  useEffect(() => {
    if (userId && suggestionsRefreshTrigger > 0) {
      // Fire and forget
      (async () => {
        try {
          await fetchSuggestions();
        } catch (e) {
          console.error(e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionsRefreshTrigger, userId]);

  // Accept suggestion
  const acceptSuggestion = useCallback(
    async (suggestionId: string) => {
      const suggestion = events.find((e) => e.id === suggestionId);
      if (!suggestion) return;

      try {
        // First remove the suggestion from local state
        setEvents((currentEvents) =>
          currentEvents.filter((e) => e.id !== suggestionId)
        );

        // Then add the real event (this will add to both database and local state)
        await addEvent({
          title: suggestion.title,
          start: suggestion.start,
          end: suggestion.end,
          links: suggestion.links,
        });

        // Note: addEvent already calls refreshDailySummary, so no need to call it again here
      } catch (error) {
        console.error("Error accepting suggestion:", error);
        // On error, restore the suggestion
        setEvents((currentEvents) => [...currentEvents, suggestion]);
      }
    },
    [events, addEvent]
  );

  // Reject suggestion
  const rejectSuggestion = useCallback((suggestionId: string) => {
    setEvents((currentEvents) =>
      currentEvents.filter((e) => e.id !== suggestionId)
    );
  }, []);

  // Reminder functions
  const createReminder = useCallback(
    async (reminderData: Omit<Reminder, "id" | "isRead">) => {
      try {
        const response = await fetch("/api/reminders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reminderData),
        });

        if (!response.ok) {
          throw new Error("Failed to create reminder");
        }

        const newReminder = await response.json();
        const formattedReminder = {
          ...newReminder,
          time: new Date(newReminder.time),
        };

        setReminders((prev) => [...prev, formattedReminder]);
      } catch (error) {
        console.error("Error creating reminder:", error);
      }
    },
    []
  );

  const dismissReminder = useCallback(
    async (reminderId: string) => {
      const reminder = reminders.find((r) => r.id === reminderId);
      const isAISuggested =
        reminder?.isAISuggested && reminderId.startsWith("ai-suggestion-");

      if (isAISuggested) {
        // For AI-suggested reminders, just update local state
        setReminders((prev) =>
          prev.map((reminder) =>
            reminder.id === reminderId
              ? { ...reminder, isRead: true }
              : reminder
          )
        );
      } else {
        // For database reminders, call the API
        try {
          const response = await fetch(`/api/reminders?id=${reminderId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to dismiss reminder");
          }

          // Update local state to mark as read
          setReminders((prev) =>
            prev.map((reminder) =>
              reminder.id === reminderId
                ? { ...reminder, isRead: true }
                : reminder
            )
          );
        } catch (error) {
          console.error("Error dismissing reminder:", error);
        }
      }
    },
    [reminders]
  );

  // Initialize data
  useEffect(() => {
    if (userId) {
      fetchReminders();
    }
  }, [userId, fetchReminders]);

  return {
    // Data
    events,
    reminders,
    calendarLoading,
    fetchedRange,

    // Setters
    setEvents,
    setReminders,
    setFetchedRange,

    // Event functions
    fetchEvents,
    addEvent,
    editEvent,
    deleteEvent,
    deleteMultipleEvents,
    bulkAddEvents,

    // Generation functions
    generateEventsAndReminders,
    fetchSuggestions,
    acceptSuggestion,
    rejectSuggestion,

    // Reminder functions
    createReminder,
    dismissReminder,
  };
};
