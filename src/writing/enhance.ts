/**
 * Writing's search, without a framework. The server renders every post the tag
 * keeps, hiding those the `q` in the URL doesn't match. This refines that list
 * as the reader types, and changing the tag navigates to the server's render
 * of it. Every URL it leaves in the address bar renders the same list.
 */
import { navigate } from "astro:transitions/client";
import { markParts, matches } from "@/activity/search";

/** `MarkedText`'s mark, so a match looks the same typed as loaded. */
const MARK_CLASS = "-mx-px rounded-[3px] bg-cat/24 px-px text-inherit";

function countLabel(count: number): string {
  return count === 1 ? "1 post" : `${count} posts`;
}

function writingUrl(query: string, tag: string): string {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (query.trim()) params.set("q", query);
  const search = params.toString();
  return search ? `/writing?${search}` : "/writing";
}

/**
 * The span a row renders a field in. `ItemRow` draws each field as a leaf span
 * whose text is the field, with any marks inside it.
 */
function fieldSpan(row: HTMLElement, value: string): HTMLElement | undefined {
  for (const span of row.querySelectorAll<HTMLElement>("a span")) {
    if (span.textContent === value && !span.querySelector("span")) return span;
  }
  return undefined;
}

function mark(row: HTMLElement, value: string | undefined, query: string) {
  if (!value) return;
  const span = fieldSpan(row, value);
  if (!span) return;
  span.replaceChildren(
    ...markParts(value, query).map((part) => {
      if (!part.hit) return document.createTextNode(part.text);
      const el = document.createElement("mark");
      el.className = MARK_CLASS;
      el.textContent = part.text;
      return el;
    }),
  );
}

function hasShown(parent: Element, selector: string): boolean {
  return [...parent.querySelectorAll<HTMLElement>(selector)].some(
    (el) => !el.hidden,
  );
}

/** Shows the posts a query matches and the sections holding them. Returns how many show. */
function filterList(query: string): number {
  let count = 0;
  for (const row of document.querySelectorAll<HTMLElement>("li[data-post]")) {
    const title = row.dataset.title ?? "";
    const text = row.dataset.text;
    row.hidden = !matches({ title, text }, query);
    if (!row.hidden) count += 1;
    mark(row, title, query);
    mark(row, text, query);
  }

  for (const week of document.querySelectorAll<HTMLElement>("[data-week]")) {
    week.hidden = !hasShown(week, "li[data-post]");
  }
  for (const section of document.querySelectorAll<HTMLElement>(
    "[data-section]",
  )) {
    section.hidden = !hasShown(section, "[data-week]");
    const rail = document.querySelector<HTMLElement>(
      `[data-rail="${section.dataset.section}"]`,
    );
    if (rail) rail.hidden = section.hidden;
  }

  const highlights = document.querySelector<HTMLElement>("[data-highlights]");
  if (highlights) highlights.hidden = query.trim() !== "";

  const empty = document.querySelector<HTMLElement>("[data-empty]");
  if (empty) {
    empty.hidden = count > 0;
    const heading = empty.querySelector("[tabindex='-1']");
    if (heading && count === 0) {
      heading.textContent = `No posts match “${query.trim()}”.`;
    }
  }
  return count;
}

interface SearchParts {
  root: HTMLElement;
  field: HTMLElement;
  input: HTMLInputElement;
  clear: HTMLButtonElement;
  toggle: HTMLButtonElement;
  status: HTMLElement;
}

function searchParts(root: HTMLElement): SearchParts | undefined {
  const field = root.querySelector<HTMLElement>("[data-search-field]");
  const input = root.querySelector<HTMLInputElement>("input[type=search]");
  const clear = root.querySelector<HTMLButtonElement>("[data-search-clear]");
  const toggle = root.querySelector<HTMLButtonElement>("[data-search-toggle]");
  const status = root.querySelector<HTMLElement>("[data-search-status]");
  if (!field || !input || !clear || !toggle || !status) return undefined;
  return { root, field, input, clear, toggle, status };
}

/** The tag selects, the phone's first and the desktop's second. */
function tagSelects(): HTMLSelectElement[] {
  return [
    ...document.querySelectorAll("form[data-writing-tools] select[name=tag]"),
  ].flatMap((el) => (el instanceof HTMLSelectElement ? [el] : []));
}

/** The copy of a control the current width shows: the phone's tools or the desktop's sidebar. */
function visible<T extends HTMLElement>(elements: readonly T[]): T | undefined {
  return elements.find((el) => el.checkVisibility());
}

export function enhanceWriting(): void {
  const forms = [
    ...document.querySelectorAll<HTMLFormElement>("form[data-writing-tools]"),
  ];
  if (forms.length === 0) return;

  const searches = [
    ...document.querySelectorAll<HTMLElement>("[data-search]"),
  ].flatMap((root) => searchParts(root) ?? []);
  const selects = tagSelects();
  const tag = selects[0]?.value ?? "";
  let query = searches[0]?.input.value ?? "";

  function search(next: string) {
    query = next;
    const count = filterList(next);
    for (const { input, clear, status } of searches) {
      if (input.value !== next) input.value = next;
      clear.hidden = next === "";
      status.textContent = next.trim() ? countLabel(count) : "";
    }
    history.replaceState(history.state, "", writingUrl(next, tag));
  }

  function setOpen(open: boolean, focus?: HTMLElement) {
    for (const { root, field, toggle } of searches) {
      if (open) root.dataset.open = "";
      else delete root.dataset.open;
      field.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      const label = open ? "Close search" : (toggle.dataset.label ?? "");
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
    }
    focus?.focus();
  }

  for (const parts of searches) {
    const { input, clear, toggle } = parts;
    input.addEventListener("input", () => search(input.value));
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (input.value !== "") search("");
      else setOpen(false, toggle);
    });
    clear.addEventListener("click", () => {
      search("");
      input.focus();
    });
    toggle.addEventListener("click", () => {
      if (toggle.getAttribute("aria-expanded") === "true") {
        search("");
        setOpen(false, toggle);
      } else {
        setOpen(true, input);
      }
    });
  }

  // Typing already filtered the list, so Enter has nothing left to send.
  for (const form of forms) {
    form.addEventListener("submit", (event) => event.preventDefault());
  }

  // The new page draws the same copies in the same order, so focus returns to
  // the one the reader changed.
  async function changeTag(i: number, value: string) {
    await navigate(writingUrl(query, value));
    tagSelects()[i]?.focus();
  }

  for (const [i, select] of selects.entries()) {
    select.addEventListener("change", () => void changeTag(i, select.value));
  }

  // A tag names at least one post, so only a search empties the list. With a
  // tag set, clearing both means a new page.
  const reset = document.querySelector<HTMLButtonElement>(
    "[data-empty] button",
  );
  reset?.addEventListener("click", () => {
    if (tag) {
      void navigate("/writing");
      return;
    }
    search("");
    visible(searches.map((s) => s.input))?.focus();
  });
}
