export const isSameDay = (d1: Date | null, d2: Date | null) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const isRangeInsideFetched = (
  start: Date,
  end: Date,
  fetchedRange: { start: Date; end: Date } | null
) => {
  if (!fetchedRange) return false;
  return start >= fetchedRange.start && end <= fetchedRange.end;
};

export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const formatDateForDisplay = (date: Date) => {
  return date.toLocaleDateString();
};

export const formatTimeForDisplay = (date: Date) => {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
