// The list a reader left for a ride, kept for the trip back. The server
// renders the log's first two months, so a reader who paged a year back and
// opened a ride would come back to a page too short to hold their place. The
// island saves the months it had and the scroll offset as it leaves, and puts
// them back when the same history entry is shown again. The ride page reads
// the same record to send its back link to that entry rather than to a fresh
// list.
//
// Session storage can be missing or full, so every read and write here
// fails quietly and leaves the page as the server rendered it.
import * as z from "zod/mini";
import { rideRowsPage } from "./rows";

const KEY = "rides:list";

const listEntry = z.object({
  /** The index the client router gave the list's history entry. */
  index: z.number(),
  /** The list's path and query, with the reader's view, search, and units. */
  href: z.string(),
  scrollY: z.number(),
  log: rideRowsPage,
});

export type ListEntry = z.infer<typeof listEntry>;

const routerState = z.object({ index: z.number() });

/** The client router's index for the current history entry, when it has one. */
export function historyIndex(): number | null {
  const state = routerState.safeParse(history.state);
  return state.success ? state.data.index : null;
}

export function saveListEntry(entry: ListEntry): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Storage is off or full: the list reloads as the server renders it.
  }
}

export function readListEntry(): ListEntry | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = listEntry.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The saved list, if it is the history entry being shown now. */
export function currentListEntry(): ListEntry | null {
  const saved = readListEntry();
  const index = historyIndex();
  if (saved === null || index === null || saved.index !== index) return null;
  return saved.href === location.pathname + location.search ? saved : null;
}

/**
 * Points a ride page's back link at the list it was opened from, and makes
 * following it a step back through history, so the list returns with its
 * months, its place, and the row the page shrinks into. A page opened any
 * other way keeps the link the server rendered.
 */
export function linkBackToList(link: HTMLAnchorElement): void {
  const saved = readListEntry();
  const index = historyIndex();
  if (saved === null || index === null || saved.index !== index - 1) return;
  link.href = saved.href;
  link.addEventListener("click", (event) => {
    const plain =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;
    if (!plain) return;
    event.preventDefault();
    history.back();
  });
}
