import { tz } from "@date-fns/tz";
import {
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  type ContextFn,
} from "date-fns";

/**
 * The moment and time zone a card's dates are written against. The Worker
 * renders in UTC, and the cached page it produced reaches a reader minutes or
 * hours later in their own zone. Hydration has to reproduce the server's text
 * exactly, so the first client render uses the server's clock and only the
 * mounted component switches to the reader's.
 */
export interface Clock {
  now: Date;
  /** An IANA zone, or `undefined` for the reader's own. */
  zone: string | undefined;
}

export function serverClock(renderedAt: string): Clock {
  return { now: new Date(renderedAt), zone: "UTC" };
}

/** Reads the time afresh, so a card added by a later page is dated from then. */
export function readerClock(): Clock {
  return {
    get now() {
      return new Date();
    },
    zone: undefined,
  };
}

function zoned(clock: Clock): { in?: ContextFn<Date> } {
  return clock.zone ? { in: tz(clock.zone) } : {};
}

export interface ActivityDate {
  /** "12 minutes ago", "Yesterday", or "Sep 18". */
  relative: string;
  /** Date and time, for the `title`. */
  full: string;
}

export function activityDate(value: string, clock: Clock): ActivityDate {
  const date = new Date(value);
  const now = clock.now;
  const options = zoned(clock);
  const days = differenceInCalendarDays(now, date, options);
  let relative: string;
  if (days === 0) {
    relative = formatDistanceStrict(date, now, { addSuffix: true });
  } else if (days === 1) {
    relative = "Yesterday";
  } else {
    relative = format(date, "MMM d", options);
  }
  return { relative, full: format(date, "PPPp", options) };
}

const NEW_REPO_MS = 90 * 24 * 60 * 60 * 1000;

export function isNewRepo(createdAt: string, clock: Clock): boolean {
  return new Date(createdAt).getTime() > clock.now.getTime() - NEW_REPO_MS;
}

export function createdLabel(createdAt: string, clock: Clock): string {
  return `Created ${format(new Date(createdAt), "PPP", zoned(clock))}`;
}

/**
 * The year a timestamp falls in, fixed to UTC so the timeline groups repos the
 * same way on the server and in every reader's browser.
 */
export function activityYear(value: string | Date): number {
  return new Date(value).getUTCFullYear();
}
