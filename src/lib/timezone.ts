export function getUtcDayBoundsForTimezone(date: Date, timezone: string): {
  dayKey: string;
  startUtc: Date;
  endUtc: Date;
} {
  // Build the local day key in user's timezone (YYYY-MM-DD)
  const dayKey = date.toLocaleDateString("en-CA", { timeZone: timezone });

  // Naive local times for boundaries (interpreted in host tz), corrected below
  const startOfDayLocal = new Date(`${dayKey}T00:00:00.000`);
  const endOfDayLocal = new Date(`${dayKey}T23:59:59.999`);

  // Compute offset between UTC and the user's timezone for this date (stable within a day)
  const testLocalNoon = new Date(`${dayKey}T12:00:00.000`);
  const utcAtNoon = testLocalNoon.getTime();
  const userTzAtNoon = new Date(
    testLocalNoon.toLocaleString("en-US", { timeZone: timezone })
  ).getTime();
  const offsetMs = utcAtNoon - userTzAtNoon;

  // Adjust boundaries to corresponding UTC instants for the user's local day
  const startUtc = new Date(startOfDayLocal.getTime() + offsetMs);
  const endUtc = new Date(endOfDayLocal.getTime() + offsetMs);

  return { dayKey, startUtc, endUtc };
}

/**
 * Get today's date in the user's timezone as YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  const today = new Date();
  return today.toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Get tomorrow's date in the user's timezone as YYYY-MM-DD format
 */
export function getTomorrowInTimezone(timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow.toLocaleDateString("en-CA", { timeZone: timezone });
}

// Google Calendar timezone conversion utilities
export function convertToGoogleDateTime(date: Date, timezone: string): { dateTime: string; timeZone: string } {
  return {
    dateTime: date.toISOString(),
    timeZone: timezone,
  };
}

export function convertFromGoogleDateTime(gDateTime: { dateTime?: string; date?: string; timeZone?: string }, userTimezone: string): Date {
  if (gDateTime.dateTime) {
    // Has specific time
    return new Date(gDateTime.dateTime);
  } else if (gDateTime.date) {
    // All-day event
    const date = new Date(gDateTime.date + 'T00:00:00');
    return date;
  } else {
    throw new Error('Invalid Google DateTime format');
  }
}

export function isAllDayEvent(gDateTime: { dateTime?: string; date?: string }): boolean {
  return !!gDateTime.date && !gDateTime.dateTime;
}


