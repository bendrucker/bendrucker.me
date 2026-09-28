// The morph between a ride's row and its page. The tapped row grows into the
// ride's title, and going back the title shrinks into the row when the row is
// on screen and fades when it isn't. `transitions.css` draws both, keyed on
// `data-vt` on the root.
//
// A row is named only for the navigation it starts. The same ride can show
// twice on the list at once, in the highlights and the log, or in both record
// lists, and two elements sharing a name abort the whole transition.
import {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from "astro:transitions/client";
import { rideTransitionName } from "./links";
import {
  currentListEntry,
  ensureListEntryId,
  LIST_SETTLED,
  markOpenedFromList,
} from "./listEntry";

const LIST_PATH = "/rides";
const RIDE_PATH = /^\/rides\/([A-Za-z0-9_-]{1,64})$/;

/**
 * How long a return holds the ride page on screen for the list to put its
 * months and place back. The browser abandons a transition whose update runs
 * past four seconds, and a list that never hydrates must not hold it that long.
 */
const SETTLE_LIMIT_MS = 1500;

function rideIdOf(url: URL): string | null {
  return RIDE_PATH.exec(url.pathname)?.[1] ?? null;
}

/** The element named for the navigation under way, to unname once it ends. */
let named: HTMLElement | null = null;
/** The ride a back navigation is leaving, to find its row once the list is in. */
let returning: string | null = null;
/** The list entry a ride is being opened from, to record on the ride's entry. */
let openedFrom: string | null = null;
/** Settles once a list returned to has put back its saved months and place. */
let settling: Promise<void> | null = null;

function name(element: HTMLElement, id: string) {
  element.style.viewTransitionName = rideTransitionName(id);
  named = element;
}

async function listSettled(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const stop = new AbortController();
  document.addEventListener(LIST_SETTLED, () => resolve(), {
    once: true,
    signal: stop.signal,
  });
  const timer = window.setTimeout(resolve, SETTLE_LIMIT_MS);
  await promise;
  stop.abort();
  window.clearTimeout(timer);
}

function onBeforePreparation(event: Event) {
  if (!(event instanceof TransitionBeforePreparationEvent)) return;
  const root = document.documentElement;
  const opening = rideIdOf(event.to);
  const leaving = rideIdOf(event.from);
  openedFrom = null;
  settling = null;

  if (
    event.direction === "forward" &&
    event.navigationType !== "traverse" &&
    event.from.pathname === LIST_PATH &&
    opening !== null
  ) {
    openedFrom = ensureListEntryId();
    const row = event.sourceElement?.closest("a");
    if (row instanceof HTMLElement) {
      name(row, opening);
      root.dataset.vt = "page";
    }
  } else if (
    event.direction === "back" &&
    leaving !== null &&
    event.to.pathname === LIST_PATH
  ) {
    returning = leaving;
    root.dataset.vt = "back";
    // A traversal has already made the list's entry the current one, so its
    // saved record can be looked up before the list is fetched.
    if (holding && currentListEntry() !== null) settling = listSettled();
  }
}

function onScreen(element: Element): boolean {
  const { top, bottom, height } = element.getBoundingClientRect();
  return height > 0 && bottom > 0 && top < window.innerHeight;
}

/**
 * Names the first row for the ride the reader is coming back from that the
 * restored scroll offset leaves on screen. With none, the title has no partner
 * and fades where it stands.
 */
function nameReturningRow() {
  const id = returning;
  returning = null;
  if (id === null) return;
  for (const row of document.querySelectorAll<HTMLAnchorElement>("main a")) {
    if (rideIdOf(new URL(row.href)) === id && onScreen(row)) {
      name(row, id);
      return;
    }
  }
}

function onAfterSwap() {
  if (openedFrom !== null) {
    markOpenedFromList(openedFrom);
    openedFrom = null;
  }
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
 * and the list hydrates after that. A return to a list with months to put
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
