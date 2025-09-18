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


