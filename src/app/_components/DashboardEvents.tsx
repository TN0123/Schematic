"use client";

import { useState, useEffect } from "react";
import { Calendar, PlusCircle } from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";
import EventTime from "./EventTime";
import { getUserTimezone } from "@/app/schedule/utils/calendarHelpers";

interface Event {
  title: string;
  start: Date;
}

interface DashboardEventsProps {
  userId: string;
}

export default function DashboardEvents({ userId }: DashboardEventsProps) {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaysEvents = async () => {
      if (!userId) return;

      try {
        const userTimezone = getUserTimezone();

        // Get today's date in user's timezone
        const today = new Date();
        const todayInUserTz = new Intl.DateTimeFormat("en-CA", {
          timeZone: userTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(today);

        // Create start and end of day boundaries in user's timezone
        const startOfDayString = `${todayInUserTz}T00:00:00`;
        const endOfDayString = `${todayInUserTz}T23:59:59`;

        const startOfDay = new Date(startOfDayString);
        const endOfDay = new Date(endOfDayString);

        // Adjust for timezone offset to get proper UTC times for database query
        const testDate = new Date();
        const localOffset = testDate.getTimezoneOffset() * 60000; // Convert to milliseconds

        // Calculate user timezone offset
        const utcTime = new Date(
          testDate.toLocaleString("en-US", { timeZone: "UTC" })
        ).getTime();
        const userTime = new Date(
          testDate.toLocaleString("en-US", { timeZone: userTimezone })
        ).getTime();
        const userOffset = utcTime - userTime;

        const offsetDifference = userOffset - localOffset;

        const adjustedStartOfDay = new Date(
          startOfDay.getTime() - offsetDifference
        );
        const adjustedEndOfDay = new Date(
          endOfDay.getTime() - offsetDifference
        );

        const response = await fetch(
          `/api/events?start=${adjustedStartOfDay.toISOString()}&end=${adjustedEndOfDay.toISOString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }

        const events = await response.json();

        // Convert string dates back to Date objects and sort by start time
        const formattedEvents = events
          .map((event: any) => ({
            ...event,
            start: new Date(event.start),
          }))
          .sort((a: Event, b: Event) => a.start.getTime() - b.start.getTime());

        setUpcomingEvents(formattedEvents.slice(0, 3));
        setTotalEventsCount(formattedEvents.length);
      } catch (error) {
        console.error("Error fetching today's events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysEvents();
  }, [userId]);

  if (loading) {
    return (
      <div>
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
            Today's Events
          </h3>
        </div>
        <div className="space-y-1">
          <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-1">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
          Today's Events
        </h3>
      </div>
      <div className="space-y-1">
        {upcomingEvents.length > 0 ? (
          <>
            {upcomingEvents.map((event, index) => (
              <div
                key={`${event.title}-${index}`}
                className="flex items-center py-1"
              >
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-3 flex-shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <p className="font-medium text-gray-900 dark:text-dark-textPrimary text-sm truncate mr-2">
                    {event.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-dark-textSecondary flex-shrink-0">
                    <EventTime startTime={event.start} />
                  </p>
                </div>
              </div>
            ))}
            {totalEventsCount > 3 && (
              <TransitionLink
                href="/schedule"
                className="flex items-center text-blue-600 dark:text-blue-400 text-sm pt-1 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
              >
                <Calendar className="h-4 w-4 mr-1" />
                {totalEventsCount - 3} more
              </TransitionLink>
            )}
          </>
        ) : (
          <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-1">
            No events scheduled for today
          </p>
        )}
      </div>
    </div>
  );
}
