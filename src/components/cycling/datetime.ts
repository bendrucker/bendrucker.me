/** `YYYY-MM-DD`, optionally followed by a time. Anything after it is ignored. */
const WALL_CLOCK =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

/**
 * Reads the wall-clock fields of a ride timestamp, ignoring any zone suffix.
 * `new Date` shifts a `Z`-suffixed or date-only value into the viewer's zone,
 * silently moving an early ride onto the previous day.
 */
export function parseRideTime(value: string): Date {
  const match = WALL_CLOCK.exec(value);
  if (!match) return new Date(NaN);
  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}
