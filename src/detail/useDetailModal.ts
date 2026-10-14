// An item opened in a modal over its list, with the URL to match. A list
// island hands this the query parameter it names items under, how to read an
// item's key from its page's path, and how to load one. Rows stay links to the
// item's page, and only a plain click on one is taken over.
//
// Astro's router answers every history traversal whose entry carries its
// state, and one between two URLs on the same list with different queries
// would refetch and swap the whole page. The modal's entries share the list's
// path, so a traversal between them is claimed through `detailTraversal`, which
// `static/detail-traversal.js` consults from a listener added before the
// router's own, and stopped there.
import {
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  type Ref,
  type ShallowRef,
} from "vue";
import {
  closeStep,
  isPlainClick,
  linkKey,
  openKey,
  openStep,
  ownsTraversal,
  withOpenKey,
} from "./url";

declare global {
  interface Window {
    /** Takes a history traversal from the router, and says whether it did. */
    detailTraversal?: (event: PopStateEvent) => boolean;
  }
}

export interface DetailSource<T> {
  /** The query parameter an open item is named under. */
  param: string;
  /** The item a same-origin path is the page of, or null for any other path. */
  keyOf: (pathname: string) => string | null;
  load: (key: string) => Promise<T>;
}

export interface OpenDetail<T> {
  key: string;
  data: T;
}

export interface DetailModal<T> {
  /** The item open, or null. */
  key: Ref<string | null>;
  /** The open item's data, or null while it loads. */
  data: ShallowRef<T | null>;
  failed: Ref<boolean>;
  open: (key: string, opener?: HTMLElement | null) => void;
  close: () => void;
  restoreFocus: () => void;
  /** Any href on this list with the open item's parameter added. */
  withOpen: (href: string) => string;
}

/** Marks an entry the modal pushed in this document, which Back can return from. */
const PUSHED = "detailPushed";

/**
 * Differs on every full page load. A state carried over a reload names the
 * document before it, whose entries Back would reload rather than traverse.
 * Drawn on first use, since a worker refuses random values at module scope.
 */
let documentToken: string | null = null;

function token(): string {
  documentToken ??= crypto.randomUUID();
  return documentToken;
}

/** How long a pointer rests on a row before its item is fetched. */
const HOVER_MS = 80;

/** Rows are matched inside the page's main region, and never inside the modal. */
const MODAL = "[data-detail-modal]";

function pushedHere(): boolean {
  const state: unknown = history.state;
  return (
    typeof state === "object" &&
    state !== null &&
    PUSHED in state &&
    state[PUSHED] === token()
  );
}

function withoutMark(state: unknown): unknown {
  if (typeof state !== "object" || state === null || !(PUSHED in state)) {
    return state;
  }
  const { [PUSHED]: _mark, ...rest } = state;
  return rest;
}

function closestLink(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const link = target.closest("a");
  if (link === null || link.closest(MODAL) !== null) return null;
  return link.closest("#main-content") === null ? null : link;
}

export function useDetailModal<T>(
  source: DetailSource<T>,
  initial: OpenDetail<T> | null,
): DetailModal<T> {
  const key = ref<string | null>(initial?.key ?? null);
  const data = shallowRef<T | null>(initial?.data ?? null);
  const failed = ref(false);

  const cache = new Map<string, Promise<T>>();
  if (initial !== null) cache.set(initial.key, Promise.resolve(initial.data));

  /** The URL the modal last saw, to tell its own traversals from the router's. */
  let current: URL | null = null;
  let opener: HTMLElement | null = null;

  async function fetchItem(itemKey: string): Promise<T> {
    let pending = cache.get(itemKey);
    if (pending === undefined) {
      pending = source.load(itemKey);
      cache.set(itemKey, pending);
    }
    try {
      return await pending;
    } catch (error) {
      // A failure isn't kept, so the next attempt asks again.
      cache.delete(itemKey);
      throw error;
    }
  }

  async function show(itemKey: string) {
    key.value = itemKey;
    failed.value = false;
    data.value = null;
    try {
      const loaded = await fetchItem(itemKey);
      if (key.value === itemKey) data.value = loaded;
    } catch {
      if (key.value === itemKey) failed.value = true;
    }
  }

  function hide() {
    key.value = null;
    data.value = null;
    failed.value = false;
  }

  /**
   * Returns focus to the row that opened the modal, once the dialog has
   * closed and the list is no longer inert. The browser does the same on its
   * own, but not for a row whose element was replaced while the modal was up.
   */
  function restoreFocus() {
    const target = opener;
    opener = null;
    if (target?.isConnected && document.activeElement !== target) {
      target.focus({ preventScroll: true });
    }
  }

  function urlWith(itemKey: string | null): string {
    return `${location.pathname}${withOpenKey(location.search, source.param, itemKey)}${location.hash}`;
  }

  function open(itemKey: string, from: HTMLElement | null = null) {
    opener = from ?? opener;
    const url = urlWith(itemKey);
    try {
      if (openStep(key.value) === "push") {
        const state: unknown = history.state;
        const base = typeof state === "object" && state !== null ? state : {};
        history.pushState({ ...base, [PUSHED]: token() }, "", url);
      } else {
        history.replaceState(history.state, "", url);
      }
    } catch {
      // Safari throws past its history budget. The modal opens regardless.
    }
    current = new URL(location.href);
    void show(itemKey);
  }

  function close() {
    if (key.value === null) return;
    if (closeStep(pushedHere()) === "back") {
      // The traversal lands in `onPopState`, which hides the modal.
      history.back();
      return;
    }
    try {
      history.replaceState(withoutMark(history.state), "", urlWith(null));
    } catch {
      // As above.
    }
    current = new URL(location.href);
    hide();
  }

  function withOpen(href: string): string {
    const url = new URL(href, location.origin);
    return `${url.pathname}${withOpenKey(url.search, source.param, key.value)}${url.hash}`;
  }

  function claimTraversal(): boolean {
    const to = new URL(location.href);
    const from = current ?? to;
    current = to;
    if (!ownsTraversal(from, to, source.param)) return false;
    const next = openKey(to.search, source.param);
    if (next === null) hide();
    else void show(next);
    return true;
  }

  function onClick(event: MouseEvent) {
    if (!isPlainClick(event)) return;
    const link = closestLink(event.target);
    if (link === null) return;
    const itemKey = linkKey(link, location.origin, source.keyOf);
    if (itemKey === null) return;
    // The capture phase runs before the router's own click listener, which
    // leaves a click whose default is prevented to the page.
    event.preventDefault();
    open(itemKey, link);
  }

  let hoverTimer: number | undefined;

  async function prefetch(target: EventTarget | null) {
    const link = closestLink(target);
    if (link === null) return;
    const itemKey = linkKey(link, location.origin, source.keyOf);
    if (itemKey === null) return;
    try {
      await fetchItem(itemKey);
    } catch {
      // Prefetching is a guess. The click asks again and shows the failure.
    }
  }

  function onPointerOver(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(hoverTimer);
    const { target } = event;
    hoverTimer = window.setTimeout(() => void prefetch(target), HOVER_MS);
  }

  function onPointerOut() {
    window.clearTimeout(hoverTimer);
  }

  function onFocusIn(event: FocusEvent) {
    void prefetch(event.target);
  }

  onMounted(() => {
    current = new URL(location.href);
    // A shared link can name an item the server couldn't find, and the list
    // rendered without it. The URL says so too.
    if (key.value === null && openKey(location.search, source.param) !== null) {
      try {
        history.replaceState(history.state, "", urlWith(null));
      } catch {
        // As above.
      }
      current = new URL(location.href);
    }
    window.detailTraversal = claimTraversal;
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("focusin", onFocusIn);
  });

  onBeforeUnmount(() => {
    window.clearTimeout(hoverTimer);
    // A page swapped in may have mounted its own list already.
    if (window.detailTraversal === claimTraversal) {
      delete window.detailTraversal;
    }
    document.removeEventListener("click", onClick, { capture: true });
    document.removeEventListener("pointerover", onPointerOver);
    document.removeEventListener("pointerout", onPointerOut);
    document.removeEventListener("focusin", onFocusIn);
  });

  return { key, data, failed, open, close, restoreFocus, withOpen };
}
