import { differenceInCalendarDays, format } from "date-fns";

/**
 * When something happened, sized to how much the reader cares: the last two
 * days by name, the last month as a count, and anything older as a date.
 */
export function formatRecency(date: Date, now: Date = new Date()): string {
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 28) return `${Math.floor(days / 7)}w ago`;
  const sameYear = date.getFullYear() === now.getFullYear();
  return format(date, sameYear ? "MMM d" : "MMM d, yyyy");
}
