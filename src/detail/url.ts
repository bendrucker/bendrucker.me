// The URL of an item open in a modal over its list. The list's own query
// parameters stay as they are and one more names the item, so `/rides?ride=<id>`
// is the log with that ride open over it. The item's own page keeps its path,
// and a row is still a link to it: only a plain click on one opens the modal.

/** The item the query names under `param`, or null when none is open. */
export function openKey(search: string, param: string): string | null {
  const key = new URLSearchParams(search).get(param);
  return key === null || key === "" ? null : key;
}

/**
 * The query with `param` naming `key`, or without it when `key` is null,
 * keeping every parameter the list owns. A slash in a key stays a slash, which
 * a query allows and a reader can read.
 */
export function withOpenKey(
  search: string,
  param: string,
  key: string | null,
): string {
  const params = new URLSearchParams(search);
  if (key === null) params.delete(param);
  else params.set(param, key);
  const query = params.toString().replaceAll("%2F", "/");
  return query === "" ? "" : `?${query}`;
}

/**
 * How opening an item moves history. The first opens a new entry, so Back
 * closes it. Opening one while another is open replaces it, so Back never
 * walks through every item a reader looked at.
 */
export function openStep(openNow: string | null): "push" | "replace" {
  return openNow === null ? "push" : "replace";
}

/**
 * How closing moves history. An entry the modal pushed is left by going back
 * to the list's own entry. One the page loaded with, from a shared link, has
 * no list entry behind it to go back to, so its URL is rewritten instead.
 */
export function closeStep(pushed: boolean): "back" | "replace" {
  return pushed ? "back" : "replace";
}

/**
 * Whether a history traversal is the modal's to answer: it stays on the list
 * and moves between entries naming different items, or between an item and
 * none. Any other traversal, including one to a hash on the same list, is the
 * router's.
 */
export function ownsTraversal(
  from: Pick<URL, "pathname" | "search">,
  to: Pick<URL, "pathname" | "search">,
  param: string,
): boolean {
  return (
    trimmed(from.pathname) === trimmed(to.pathname) &&
    openKey(from.search, param) !== openKey(to.search, param)
  );
}

export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

/**
 * A primary click with no modifier held. Every other click keeps the browser's
 * meaning: a new tab, a new window, a download.
 */
export function isPlainClick(event: ClickLike): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}

export interface LinkLike {
  href: string;
  target: string;
  hasAttribute(name: string): boolean;
}

/**
 * The item a link opens in this page's modal, or null for a link that leaves
 * it: another origin, another tab, a download, or a path `keyOf` doesn't name.
 */
export function linkKey(
  link: LinkLike,
  origin: string,
  keyOf: (pathname: string) => string | null,
): string | null {
  if (link.target !== "" && link.target !== "_self") return null;
  if (link.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(link.href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return keyOf(trimmed(url.pathname));
}

function trimmed(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

/** A path segment decoded, or as it stands when it isn't valid encoding. */
export function decodedSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
