"use client";

import { useMemo, useState, useEffect } from "react";

type NextTodayEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
} | null;

export default function DateTimeDisplay({ userId }: { userId?: string }) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [nextEvent, setNextEvent] = useState<NextTodayEvent>(null);

  useEffect(() => {
    // Set initial time and mark as client
    setCurrentTime(new Date());
    setIsClient(true);

    // Set up interval for updates
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;

    let isCancelled = false;

    const fetchNextToday = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(
          `/api/events/next-today?timezone=${encodeURIComponent(timezone)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { event: NextTodayEvent };
        if (!isCancelled) {
          setNextEvent(data.event ?? null);
        }
      } catch {
        // Best-effort only; don't block rendering
      }
    };

    fetchNextToday();
    const interval = setInterval(fetchNextToday, 5 * 60 * 1000); // keep it reasonably fresh

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const meetingText = useMemo(() => {
    if (!nextEvent) return null;
    const start = new Date(nextEvent.start);
    const now = currentTime ?? new Date();
    const diffMs = start.getTime() - now.getTime();
    if (Number.isNaN(diffMs) || diffMs <= 0) return null;

    const diffMinutes = Math.ceil(diffMs / 60000);
    const eventTitle = nextEvent.title || "event";
    if (diffMinutes < 60) {
      const unit = diffMinutes === 1 ? "minute" : "minutes";
      return `${eventTitle} in ${diffMinutes} ${unit}`;
    }

    const diffHours = Math.ceil(diffMinutes / 60);
    const unit = diffHours === 1 ? "hour" : "hours";
    return `${eventTitle} in ${diffHours} ${unit}`;
  }, [nextEvent, currentTime]);

  // Show skeleton placeholder during SSR and initial hydration
  if (!isClient || !currentTime) {
    return (
      <div className="text-center min-h-[120px] sm:min-h-[140px] lg:min-h-[160px] flex flex-col justify-center">
        {/* Time skeleton */}
        <div className="h-10 sm:h-12 lg:h-14 w-40 sm:w-48 lg:w-56 mx-auto rounded-lg bg-gray-200 dark:bg-dark-secondary animate-pulse" />
        {/* Date skeleton */}
        <div className="h-6 sm:h-7 lg:h-8 w-48 sm:w-56 lg:w-64 mx-auto rounded-md bg-gray-200 dark:bg-dark-secondary animate-pulse mt-3" />
        {/* Meeting text placeholder - always reserve space */}
        <div className="h-5 sm:h-6 w-32 sm:w-36 mx-auto rounded-md bg-transparent mt-3" />
      </div>
    );
  }

  return (
    <div className="text-center min-h-[120px] sm:min-h-[140px] lg:min-h-[160px] flex flex-col justify-center animate-fade-in">
      <div className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-900 dark:text-dark-textPrimary transition-opacity duration-300">
        {formatTime(currentTime)}
      </div>
      <div className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-600 dark:text-dark-textSecondary mt-2 transition-opacity duration-300">
        {formatDate(currentTime)}
      </div>
      {/* Always reserve space for meeting text to prevent layout shift */}
      <div className="h-5 sm:h-6 mt-3 flex items-center justify-center">
        <span
          className={`text-sm sm:text-base font-medium text-gray-500 dark:text-dark-textSecondary transition-all duration-300 ${
            meetingText
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-1"
          }`}
        >
          {meetingText || "\u00A0"}
        </span>
      </div>
    </div>
  );
}
