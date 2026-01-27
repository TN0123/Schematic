"use client";

import { useState, useEffect } from "react";

export default function DateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

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

  // Show skeleton placeholder during SSR and initial hydration
  if (!isClient || !currentTime) {
    return (
      <div className="text-center min-h-[120px] sm:min-h-[140px] lg:min-h-[160px] flex flex-col justify-center">
        {/* Time skeleton */}
        <div className="h-10 sm:h-12 lg:h-14 w-40 sm:w-48 lg:w-56 mx-auto rounded-lg bg-gray-200 dark:bg-dark-secondary animate-pulse" />
        {/* Date skeleton */}
        <div className="h-6 sm:h-7 lg:h-8 w-48 sm:w-56 lg:w-64 mx-auto rounded-md bg-gray-200 dark:bg-dark-secondary animate-pulse mt-3" />
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
    </div>
  );
}
