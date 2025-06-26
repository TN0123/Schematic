import { useState, useEffect, useCallback } from "react";
import { getUserTimezone } from "../utils/calendarHelpers";

export const useDailySummary = (userId: string | undefined) => {
  const [dailySummary, setDailySummary] = useState("");
  const [dailySummaryDate, setDailySummaryDate] = useState<Date | null>(
    new Date()
  );
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchDailySummary = useCallback(
    async (date: Date) => {
      setDailySummaryLoading(true);
      try {
        const userTimezone = getUserTimezone();

        const response = await fetch("/api/daily-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: date.toISOString(),
            timezone: userTimezone,
            userId: userId,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch daily summary");
        }
        const data = await response.json();
        setDailySummary(data.result);
      } catch (error) {
        console.error("Error fetching daily summary:", error);
        setDailySummary("Could not load summary.");
      } finally {
        setDailySummaryLoading(false);
      }
    },
    [userId]
  );

  const refreshDailySummary = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (dailySummaryDate && userId) {
      fetchDailySummary(dailySummaryDate);
    } else {
      setDailySummary("");
    }
  }, [dailySummaryDate, userId, refreshTrigger, fetchDailySummary]);

  return {
    dailySummary,
    dailySummaryDate,
    dailySummaryLoading,
    setDailySummaryDate,
    refreshDailySummary,
  };
};
