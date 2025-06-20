import { useState, useEffect } from "react";
import { getUserTimezone } from "../utils/calendarHelpers";

export const useDailySummary = (userId: string | undefined) => {
  const [dailySummary, setDailySummary] = useState("");
  const [dailySummaryDate, setDailySummaryDate] = useState<Date | null>(
    new Date()
  );
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);

  useEffect(() => {
    const fetchDailySummary = async (date: Date) => {
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
    };

    if (dailySummaryDate && userId) {
      fetchDailySummary(dailySummaryDate);
    } else {
      setDailySummary("");
    }
  }, [dailySummaryDate, userId]);

  return {
    dailySummary,
    dailySummaryDate,
    dailySummaryLoading,
    setDailySummaryDate,
  };
};
