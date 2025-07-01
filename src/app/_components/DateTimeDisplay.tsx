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
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Show placeholder during SSR and initial hydration
  if (!isClient || !currentTime) {
    return (
      <div className="text-right">
        <div className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-dark-textPrimary">
          --:-- --
        </div>
        <div className="text-base sm:text-lg font-medium text-gray-600 dark:text-dark-textSecondary">
          --- --- --, ----
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <div className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-dark-textPrimary">
        {formatTime(currentTime)}
      </div>
      <div className="text-base sm:text-lg font-medium text-gray-600 dark:text-dark-textSecondary">
        {formatDate(currentTime)}
      </div>
    </div>
  );
}
