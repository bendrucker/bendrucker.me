/**
 * How a route's rows fall into labeled sections. Your own work (rides, code,
 * posts) is dated to the day and sits on a timeline gutter. Media groups by
 * season with no gutter, since it isn't dated to the day on the page.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const SEASONS = ["Winter", "Spring", "Summer", "Fall"] as const;

export type GroupMode = "month" | "season" | "year";

/** Anything dated by a local calendar day, `YYYY-MM-DD`. */
export interface Dated {
  day: string;
}

export interface GroupedRow<T> {
  item: T;
  /** The first row of a day carries the day in the gutter. Later rows leave it blank. */
  showDay: boolean;
  /** The day of the month, without padding. */
  dayNum: string;
  /** The month under the day, where the section isn't already a month. */
  sub?: string;
}

/** A run of rows the gutter's line joins. The line breaks between weeks. */
export interface Week<T> {
  key: string;
  rows: GroupedRow<T>[];
}

export interface Section<T> {
  key: string;
  label: string;
  weeks: Week<T>[];
}

export interface GroupOptions {
  /** The current year, which section labels leave unsaid. */
  thisYear: string;
}

function monthIndex(day: string): number {
  return Number(day.slice(5, 7)) - 1;
}

/**
 * A season's key, `YYYY-N` with N from 0 (winter) to 3 (fall). December opens
 * the winter of the year that follows it.
 */
export function seasonOf(day: string): string {
  const month = monthIndex(day) + 1;
  const year = Number(day.slice(0, 4)) + (month === 12 ? 1 : 0);
  return `${year}-${Math.floor((month % 12) / 3)}`;
}

/** The Monday that starts a day's week. */
export function weekOf(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** A three-letter lowercase month, as the gutter prints it under a day. */
export function monthShort(day: string): string {
  return (MONTHS[monthIndex(day)] ?? "").slice(0, 3).toLowerCase();
}

/** Whether a row shows its day: only the first row of each day does. */
export function showDay(day: string, previousDay: string | undefined): boolean {
  return day !== previousDay;
}

function sectionKey(day: string, mode: GroupMode): string {
  if (mode === "year") return day.slice(0, 4);
  if (mode === "season") return seasonOf(day);
  return day.slice(0, 7);
}

/** A section's heading: the month or season, with the year once it isn't this one. */
export function sectionLabel(
  key: string,
  mode: GroupMode,
  { thisYear }: GroupOptions,
): string {
  const year = key.slice(0, 4);
  if (mode === "year") return year;
  const name =
    (mode === "season"
      ? SEASONS[Number(key.slice(5))]
      : MONTHS[Number(key.slice(5, 7)) - 1]) ?? "";
  return year === thisYear ? name : `${name} ${year}`;
}

export interface RailYear {
  year: string;
  months: { key: string; label: string }[];
}

/**
 * Month keys, `YYYY-MM` and newest first, grouped under their year for a
 * sidebar rail. The year heads the group, so a month is named alone.
 */
export function monthsByYear(keys: readonly string[]): RailYear[] {
  const years: RailYear[] = [];
  for (const key of keys) {
    const year = key.slice(0, 4);
    const label = MONTHS[Number(key.slice(5, 7)) - 1] ?? "";
    const last = years.at(-1);
    if (last?.year === year) last.months.push({ key, label });
    else years.push({ year, months: [{ key, label }] });
  }
  return years;
}

export interface RailMonth {
  key: string;
  label: string;
  /** Whether the year has a section for this month to jump to. */
  present: boolean;
}

/**
 * A rail year's twelve months in calendar order, with the ones it has no
 * section for marked absent. A year still under way lays out like a finished
 * one, so switching between them moves nothing.
 */
export function calendarMonths({ year, months }: RailYear): RailMonth[] {
  const present = new Set(months.map((month) => month.key));
  return MONTHS.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    return { key, label, present: present.has(key) };
  });
}

/**
 * Groups rows, newest first, into sections by month, season, or year, and each
 * section into weeks. A season has no days to break on, so it is one week.
 * Rows must already be sorted newest first.
 */
export function groupRows<T extends Dated>(
  items: readonly T[],
  mode: GroupMode,
  options: GroupOptions,
): Section<T>[] {
  const sections: Section<T>[] = [];
  let previousDay: string | undefined;

  for (const item of items) {
    const key = sectionKey(item.day, mode);
    let section = sections.at(-1);
    if (section?.key !== key) {
      section = { key, label: sectionLabel(key, mode, options), weeks: [] };
      sections.push(section);
    }

    const weekKey = mode === "season" ? key : weekOf(item.day);
    let week = section.weeks.at(-1);
    if (week?.key !== weekKey) {
      week = { key: weekKey, rows: [] };
      section.weeks.push(week);
    }

    week.rows.push({
      item,
      showDay: showDay(item.day, previousDay),
      dayNum: String(Number(item.day.slice(8, 10))),
      // A year spans months, so its gutter says which.
      ...(mode === "year" && { sub: monthShort(item.day) }),
    });
    previousDay = item.day;
  }

  return sections;
}
