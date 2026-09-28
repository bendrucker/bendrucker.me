// The list a reader left for a ride, kept for the trip back. The server
// renders the log's first two months, so a reader who paged a year back and
// opened a ride would come back to a page too short to hold their place. The
// island saves the months it had and the scroll offset as it leaves, and puts
// them back when the same history entry is shown again. The ride page reads
// the same record to send its back link to that entry rather than to a fresh
// list.
//
// The record is keyed to the history entry itself, by an id kept in that
// entry's `history.state`. The client router's index can't serve: every full
// page load starts it at zero, so a new visit to the list would match a record
// an older visit left behind. A new entry starts without an id and restores
// nothing.
//
// Session storage can be missing or full, so every read and write here
// fails quietly and leaves the page as the server rendered it.
import * as z from "zod/mini";
import { rideRowsPage } from "./rows";

const KEY = "rides:list";

/** Fired once the list has put back what it saved, for the morph to wait on. */
export const LIST_SETTLED = "rides:list-settled";

const listEntry = z.object({
  /** The id of the list's history entry. */
  id: z.string(),
  /** The list's path and query, with the reader's view, search, and units. */
  href: z.string(),
  scrollY: z.number(),
  log: rideRowsPage,
});

export type ListEntry = z.infer<typeof listEntry>;

const entryState = z.looseObject({
  /** On the list's entry, the id its saved record is kept under. */
  ridesList: z.optional(z.string()),
  /** On a ride's entry, the id of the list entry it was opened from. */
  fromList: z.optional(z.string()),
});

type EntryState = z.infer<typeof entryState>;

function readState(): EntryState | null {
  const state = entryState.safeParse(history.state);
  return state.success ? state.data : null;
}

/**
 * Adds fields to the current entry's state. An entry the router has not
 * given a state yet is left alone, since the router takes any state it finds
 * as its own and would read no index from this one.
 */
function writeState(fields: EntryState): boolean {
  const state = readState();
  if (state === null) return false;
  try {
    history.replaceState({ ...state, ...fields }, "");
    return true;
  } catch {
    // Safari throws past its replaceState budget.
    return false;
  }
}

/** The id of the list entry being shown, when it was given one. */
export function listEntryIdOfState(): string | null {
  return readState()?.ridesList ?? null;
}

/**
 * The id of the list entry being shown, giving it one if it has none. Called
 * as the reader leaves, while the entry is still the current one.
 */
export function ensureListEntryId(): string | null {
  const existing = listEntryIdOfState();
  if (existing !== null) return existing;
  const id = crypto.randomUUID();
  return writeState({ ridesList: id }) ? id : null;
}

/** Records on a ride's entry which list entry it was opened from. */
export function markOpenedFromList(id: string): void {
  writeState({ fromList: id });
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
  const id = listEntryIdOfState();
  return saved !== null && id !== null && saved.id === id ? saved : null;
}

/** Tells the morph the list is back where the reader left it. */
export function announceListSettled(): void {
  document.dispatchEvent(new Event(LIST_SETTLED));
}

/**
 * Points a ride page's back link at the list it was opened from, and makes
 * following it a step back through history, so the list returns with its
 * months, its place, and the row the page shrinks into. A page opened any
 * other way keeps the link the server rendered.
 */
export function linkBackToList(link: HTMLAnchorElement): void {
  const saved = readListEntry();
  const from = readState()?.fromList;
  if (saved === null || from === undefined || saved.id !== from) return;
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
