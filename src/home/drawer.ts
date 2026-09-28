// The home cards' drawers. Each card's body rests at a peek height the
// stylesheet sets, so every card in a row stands the same height. A card whose
// body overruns the peek is marked tall, which shows its handle. The handle
// toggles the drawer on a tap, and on a phone it can be dragged: the drawer
// follows the finger, with resistance past either end, then springs to
// whichever end the flick or the midpoint favours.
//
// The cards are server-rendered markup that no island owns, so one set of
// listeners on the document drives every card, and the router's page-load
// event re-measures whichever cards the new page brought.

/** Depth of the fade over a shut drawer's foot, in pixels. */
export const FADE = 48;

/** Release speed, in pixels per millisecond, that decides a drag on its own. */
export const FLICK = 0.35;

/** Share of a pull past either end the drawer follows. */
const RESIST = 0.3;

/** Travel before a press on the handle counts as a drag, in pixels. */
const SLOP = 5;

/** The drawer's height for a pull to `height`, resisting past either end. */
export function rubberBand(height: number, peek: number, full: number): number {
  if (height > full) return full + (height - full) * RESIST;
  if (height < peek) return peek - (peek - height) * RESIST;
  return height;
}

/** The fade's depth at a height, full at the peek and gone once open. */
export function fadeDepth(height: number, peek: number, full: number): number {
  if (full <= peek) return 0;
  const shut = (full - height) / (full - peek);
  return Math.round(FADE * Math.min(1, Math.max(0, shut)));
}

/** Whether a released drag settles open. */
export function settlesOpen(release: {
  velocity: number;
  height: number;
  peek: number;
  full: number;
}): boolean {
  if (release.velocity > FLICK) return true;
  if (release.velocity < -FLICK) return false;
  return release.height > (release.peek + release.full) / 2;
}

interface Card {
  card: HTMLElement;
  drawer: HTMLElement;
  body: HTMLElement;
  toggle: HTMLElement;
}

interface Pull {
  parts: Card;
  pointer: number;
  startY: number;
  startHeight: number;
  y: number;
  time: number;
  velocity: number;
  height: number;
  moved: boolean;
}

function cardOf(target: EventTarget | null): Card | undefined {
  if (!(target instanceof Element)) return undefined;
  const card = target.closest("[data-drawer-card]");
  if (!(card instanceof HTMLElement)) return undefined;
  const drawer = card.querySelector("[data-drawer]");
  const body = card.querySelector("[data-drawer-body]");
  const toggle = card.querySelector("[data-drawer-toggle]");
  if (
    !(drawer instanceof HTMLElement) ||
    !(body instanceof HTMLElement) ||
    !(toggle instanceof HTMLElement)
  ) {
    return undefined;
  }
  return { card, drawer, body, toggle };
}

/**
 * The drawer's resting height, the room it leaves below its body once open,
 * and the height that shows the whole body. The body sits inside the drawer's
 * top padding, so its bottom edge is the full height.
 */
function metrics({ drawer, body }: Card) {
  const style = getComputedStyle(drawer);
  return {
    peek: Number.parseFloat(style.getPropertyValue("--drawer-peek")) || 0,
    room: Number.parseFloat(style.getPropertyValue("--drawer-room")) || 0,
    full: body.offsetTop + body.offsetHeight,
  };
}

const isOpen = ({ card }: Card) => card.dataset.state === "open";
const isTall = ({ card }: Card) => card.dataset.size === "tall";

function setOpen(parts: Card, open: boolean): void {
  const { card, drawer, toggle } = parts;
  const { full, room } = metrics(parts);
  if (open) card.dataset.state = "open";
  else delete card.dataset.state;
  drawer.style.height = open ? `${full + room}px` : "";
  drawer.style.removeProperty("--drawer-fade");
  toggle.setAttribute("aria-expanded", String(open));
}

/** Marks the card tall or fitting, and keeps an open drawer at its body's height. */
function measure(parts: Card): void {
  const { peek, full } = metrics(parts);
  const tall = full > peek + 1;
  parts.card.dataset.size = tall ? "tall" : "fits";
  if (!tall && isOpen(parts)) setOpen(parts, false);
  else if (isOpen(parts)) setOpen(parts, true);
}

let pull: Pull | undefined;
let dragged = false;

function onPointerDown(event: PointerEvent): void {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest("[data-drawer-toggle]")) return;
  const parts = cardOf(event.target);
  if (!parts || !isTall(parts) || !event.isPrimary) return;
  const { peek, full } = metrics(parts);
  const startHeight = isOpen(parts) ? full : peek;
  parts.toggle.setPointerCapture(event.pointerId);
  pull = {
    parts,
    pointer: event.pointerId,
    startY: event.clientY,
    startHeight,
    y: event.clientY,
    time: event.timeStamp,
    velocity: 0,
    height: startHeight,
    moved: false,
  };
}

function onPointerMove(event: PointerEvent): void {
  if (pull?.pointer !== event.pointerId) return;
  const dy = event.clientY - pull.startY;
  if (!pull.moved && Math.abs(dy) < SLOP) return;
  pull.moved = true;
  const dt = event.timeStamp - pull.time;
  if (dt > 0) {
    pull.velocity = 0.7 * ((event.clientY - pull.y) / dt) + 0.3 * pull.velocity;
  }
  pull.y = event.clientY;
  pull.time = event.timeStamp;

  const { card, drawer } = pull.parts;
  const { peek, full } = metrics(pull.parts);
  pull.height = rubberBand(pull.startHeight + dy, peek, full);
  card.dataset.state = "drag";
  drawer.style.height = `${pull.height}px`;
  drawer.style.setProperty(
    "--drawer-fade",
    `${fadeDepth(pull.height, peek, full)}px`,
  );
}

function onPointerUp(event: PointerEvent): void {
  if (pull?.pointer !== event.pointerId) return;
  const released = pull;
  pull = undefined;
  if (!released.moved) return;
  // The release decides, so the click that follows it is dropped.
  dragged = true;
  setTimeout(() => {
    dragged = false;
  }, 0);
  const { peek, full } = metrics(released.parts);
  setOpen(
    released.parts,
    settlesOpen({
      velocity: released.velocity,
      height: released.height,
      peek,
      full,
    }),
  );
}

function onClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest("[data-drawer-toggle]")) return;
  if (dragged) {
    dragged = false;
    return;
  }
  const parts = cardOf(event.target);
  if (parts) setOpen(parts, !isOpen(parts));
}

/**
 * Tabbing to a row under the peek opens its drawer, since the row would
 * otherwise take focus out of sight. The browser may already have scrolled
 * the clipped drawer to show it, which opening puts back.
 */
function onFocusIn(event: FocusEvent): void {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest("[data-drawer]")) return;
  const parts = cardOf(event.target);
  if (!parts || !isTall(parts) || isOpen(parts)) return;
  const shown = parts.drawer.getBoundingClientRect().bottom - FADE;
  if (event.target.getBoundingClientRect().bottom <= shown) return;
  parts.drawer.scrollTop = 0;
  setOpen(parts, true);
}

function onResize(entries: ResizeObserverEntry[]): void {
  for (const entry of entries) {
    const parts = cardOf(entry.target);
    if (parts && parts.card.dataset.state !== "drag") measure(parts);
  }
}

let sizes: ResizeObserver | undefined;

/** Watches the page's cards, so a body that wraps or loads art re-measures. */
function watchCards(): void {
  sizes ??= new ResizeObserver(onResize);
  sizes.disconnect();
  for (const body of document.querySelectorAll("[data-drawer-body]")) {
    sizes.observe(body);
  }
}

/** Crossing the breakpoint changes the peek without resizing any body. */
function remeasureAll(): void {
  for (const card of document.querySelectorAll("[data-drawer-card]")) {
    const parts = cardOf(card);
    if (parts) measure(parts);
  }
}

let installed = false;

/**
 * Listens for every card the site will render, and measures the ones on the
 * page now. Calling it again only re-measures, which is how a story picks up
 * cards it mounted after the first call.
 */
export function installDrawers(): void {
  if (installed) {
    watchCards();
    return;
  }
  installed = true;
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("click", onClick);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("astro:page-load", watchCards);
  matchMedia("(min-width: 48rem)").addEventListener("change", remeasureAll);
  watchCards();
}
