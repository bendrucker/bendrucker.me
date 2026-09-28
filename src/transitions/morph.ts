// The morph between a row and its item's page. The tapped row grows into the
// page's title as a solid shape over a list that holds still, and going back
// the title shrinks into the row when the row is on screen and fades when it
// isn't. Every other navigation crossfades. `transitions.css` draws each,
// keyed on `data-vt` on the root.
//
// A row is named only for the navigation it starts. The same item can show
// twice on a list at once, in the highlights and the months below them, and
// two elements sharing a name abort the whole transition. Naming every row
// would also lift each one out of the list's snapshot to fade on its own.
//
// This script ships on every page but a post, which keeps post pages to the
// router and the theme toggle. The navigation into a post runs the list's copy,
// which stays loaded for the trip back, so only a reader who lands on a post
// directly gets a crossfade instead of the shrink on the way out. The Rides
// list's saved place is loaded only by a navigation to or from that list.
import {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from "astro:transitions/client";
import { isList, itemTransitionName } from "./names";

/** The list that saves its place for the trip back from a ride. */
const RIDES_PATH = "/rides";

/**
 * How long a return holds the ride page on screen for the list to put its
 * months and place back. The browser abandons a transition whose update runs
 * past four seconds, and a list that never hydrates must not hold it that long.
 */
const SETTLE_LIMIT_MS = 1500;

/** The element named for the navigation under way, to unname once it ends. */
let named: HTMLElement | null = null;
/** The name of the item a return is leaving, to find its row once the list is in. */
let returning: string | null = null;
/** Records on the ride's entry which Rides list entry it was opened from. */
let markOpened: (() => void) | null = null;
/** Settles once the Rides list returned to has put back its saved months and place. */
let settling: Promise<void> | null = null;

function name(element: HTMLElement, transitionName: string) {
  element.style.viewTransitionName = transitionName;
  named = element;
}

async function listSettled(settledEvent: string): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const stop = new AbortController();
  document.addEventListener(settledEvent, () => resolve(), {
    once: true,
    signal: stop.signal,
  });
  const timer = window.setTimeout(resolve, SETTLE_LIMIT_MS);
  await promise;
  stop.abort();
  window.clearTimeout(timer);
}

/**
 * Runs `work` alongside the page's fetch, before the router swaps anything in
 * or moves the history entry. `work` checks the event's signal before setting
 * anything, so a navigation abandoned mid-fetch can't overwrite the next one.
 */
function whileLoading(
  event: TransitionBeforePreparationEvent,
  work: () => Promise<void>,
) {
  const load = event.loader;
  event.loader = async () => {
    await Promise.all([work(), load()]);
  };
}

function onBeforePreparation(event: Event) {
  if (!(event instanceof TransitionBeforePreparationEvent)) return;
  const root = document.documentElement;
  const opening = itemTransitionName(event.to.pathname);
  const leaving = itemTransitionName(event.from.pathname);
  markOpened = null;
  settling = null;
  returning = null;

  if (
    event.direction === "forward" &&
    event.navigationType !== "traverse" &&
    isList(event.from.pathname) &&
    opening !== null
  ) {
    const row = event.sourceElement?.closest("a");
    if (row instanceof HTMLElement) {
      name(row, opening);
      root.dataset.vt = "page";
    }
    if (event.from.pathname === RIDES_PATH) {
      whileLoading(event, async () => {
        const { ensureListEntryId, markOpenedFromList } =
          await import("@/rides/listEntry");
        // The list's entry is still the current one until the swap.
        const id = ensureListEntryId();
        if (id === null || event.signal.aborted) return;
        markOpened = () => markOpenedFromList(id);
      });
    }
  } else if (leaving !== null && isList(event.to.pathname)) {
    returning = leaving;
    root.dataset.vt = "back";
    // A traversal has already made the list's entry the current one, so its
    // saved record can be looked up while the list is fetched.
    if (holding && event.to.pathname === RIDES_PATH) {
      whileLoading(event, async () => {
        const { currentListEntry, LIST_SETTLED } =
          await import("@/rides/listEntry");
        if (currentListEntry() === null || event.signal.aborted) return;
        settling = listSettled(LIST_SETTLED);
      });
    }
  }
}

function onScreen(element: Element): boolean {
  const { top, bottom, height } = element.getBoundingClientRect();
  return height > 0 && bottom > 0 && top < window.innerHeight;
}

/**
 * Names the first row for the item the reader is coming back from that the
 * restored scroll offset leaves on screen. With none, the title has no partner
 * and fades where it stands.
 */
function nameReturningRow() {
  const transitionName = returning;
  returning = null;
  if (transitionName === null) return;
  for (const row of document.querySelectorAll<HTMLAnchorElement>("main a")) {
    const url = new URL(row.href);
    if (url.origin !== location.origin) continue;
    if (itemTransitionName(url.pathname) === transitionName && onScreen(row)) {
      name(row, transitionName);
      return;
    }
  }
}

/** The router restores the scroll offset before this, so a row's place is final. */
function onAfterSwap() {
  markOpened?.();
  markOpened = null;
  // A list with months to put back names its row once it has them.
  if (settling === null) nameReturningRow();
}

async function settle(transition: ViewTransition) {
  try {
    await transition.finished;
  } catch {
    // A skipped transition rejects, and there is still a name to clear.
  }
  delete document.documentElement.dataset.vt;
  named?.style.removeProperty("view-transition-name");
  named = null;
}

// The swap replaces every attribute on the root with the new document's, so
// the flag is copied onto the new root for the new pseudo-elements to match.
function onBeforeSwap(event: Event) {
  if (!(event instanceof TransitionBeforeSwapEvent)) return;
  const vt = document.documentElement.dataset.vt;
  if (vt === undefined) return;
  event.newDocument.documentElement.dataset.vt = vt;
  void settle(event.viewTransition);
}

/**
 * The browser captures the new page as soon as the router's update settles,
 * and the Rides list hydrates after that. A return to it with months to put
 * back holds the capture until the list has them and has scrolled to where
 * the reader was, so the title shrinks into the row at its place rather than
 * into the list's top.
 */
function holdForList(): boolean {
  if (!("startViewTransition" in document)) return false;
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = (options) => {
    if (typeof options !== "function") return start(options);
    return start(async () => {
      await options();
      const pending = settling;
      settling = null;
      if (pending === null) return;
      await pending;
      nameReturningRow();
    });
  };
  return true;
}

const holding = holdForList();

document.addEventListener("astro:before-preparation", onBeforePreparation);
document.addEventListener("astro:before-swap", onBeforeSwap);
document.addEventListener("astro:after-swap", onAfterSwap);
