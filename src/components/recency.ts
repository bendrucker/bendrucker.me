import { differenceInCalendarDays } from "date-fns";

export type RecencyLabel = "today" | "yesterday" | "this week" | "earlier";

const LABELS: readonly RecencyLabel[] = [
  "today",
  "yesterday",
  "this week",
  "earlier",
];

/** Which shelf a date belongs on, when a list is sorted newest first. */
export function recencyLabel(date: Date, now: Date = new Date()): RecencyLabel {
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return "this week";
  return "earlier";
}

export interface RecencyGroup<T> {
  label: RecencyLabel;
  items: T[];
}

/**
 * Items shelved by how recent they are, in shelf order, with empty shelves
 * left out. The label does the work a date beside every row would, once.
 */
export function groupByRecency<T>(
  items: readonly T[],
  when: (item: T) => Date,
  now: Date = new Date(),
): RecencyGroup<T>[] {
  const shelves = new Map<RecencyLabel, T[]>();
  for (const item of items) {
    const label = recencyLabel(when(item), now);
    const shelf = shelves.get(label);
    if (shelf) shelf.push(item);
    else shelves.set(label, [item]);
  }
  return LABELS.flatMap((label) => {
    const shelf = shelves.get(label);
    return shelf ? [{ label, items: shelf }] : [];
  });
}
