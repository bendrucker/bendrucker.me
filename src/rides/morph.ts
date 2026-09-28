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

const LIST_PATH = "/rides";
const RIDE_PATH = /^\/rides\/([A-Za-z0-9_-]{1,64})$/;

function rideIdOf(url: URL): string | null {
  return RIDE_PATH.exec(url.pathname)?.[1] ?? null;
}

/** The element named for the navigation under way, to unname once it ends. */
let named: HTMLElement | null = null;
/** The ride a back navigation is leaving, to find its row once the list is in. */
let returning: string | null = null;

function name(element: HTMLElement, id: string) {
  element.style.viewTransitionName = rideTransitionName(id);
  named = element;
}

function onBeforePreparation(event: Event) {
  if (!(event instanceof TransitionBeforePreparationEvent)) return;
  const root = document.documentElement;
  const opening = rideIdOf(event.to);
  const leaving = rideIdOf(event.from);

  if (
    event.direction === "forward" &&
    event.from.pathname === LIST_PATH &&
    opening !== null
  ) {
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
function onAfterSwap() {
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

function onBeforeSwap(event: Event) {
  if (!(event instanceof TransitionBeforeSwapEvent)) return;
  if (document.documentElement.dataset.vt === undefined) return;
  void settle(event.viewTransition);
}

document.addEventListener("astro:before-preparation", onBeforePreparation);
document.addEventListener("astro:before-swap", onBeforeSwap);
document.addEventListener("astro:after-swap", onAfterSwap);
