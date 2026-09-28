import { describe, expect, it } from "vitest";
import { category } from "@/categories";
import { loadMediaFeed } from "./load";
import {
  buildMediaView,
  filtersFromUrl,
  searchWithFilters,
  type MediaView,
} from "./view";

const OPTIONS = { q: "", type: "", thisYear: "2026" };

function titles(view: MediaView) {
  return {
    highlights: view.highlights.map((h) => h.title),
    sections: view.sections.map((s) => ({
      label: s.label,
      rows: s.weeks.flatMap((w) => w.rows.map((r) => r.item.title)),
    })),
  };
}

/** What a phone shows: three highlights, and every row not among them. */
function phone(view: MediaView) {
  return {
    highlights: view.highlights
      .filter((h) => !h.desktopOnly)
      .map((h) => h.title),
    sections: view.sections.map((s) => ({
      label: s.label,
      rows: s.weeks.flatMap((w) => w.rows.map((r) => r.item.title)),
    })),
  };
}

/** What a desktop shows: five highlights, and the list without them. */
function desktop(view: MediaView) {
  return {
    highlights: view.highlights.map((h) => h.title),
    sections: view.sections
      .filter((s) => !s.phoneOnly)
      .map((s) => ({
        label: s.label,
        rows: s.weeks.flatMap((w) =>
          w.rows.filter((r) => !r.item.phoneOnly).map((r) => r.item.title),
        ),
      })),
  };
}

describe("buildMediaView", () => {
  it("leads Reading with notes, then books", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("reading");
    const view = buildMediaView(rows, highlightKeys, OPTIONS);

    expect(phone(view)).toEqual({
      highlights: ["The Web We Lost", "The Overstory", "Piranesi"],
      sections: [
        { label: "Fall", rows: ["Local-first software"] },
        {
          label: "Summer",
          rows: [
            "Choose Boring Technology",
            "Things You Should Never Do, Part I",
            "Tomorrow, and Tomorrow, and Tomorrow",
            "Reflections on Trusting Trust",
          ],
        },
      ],
    });
    expect(desktop(view).highlights).toHaveLength(4);
  });

  it("leads Watching with the latest watched", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("watching");
    const view = buildMediaView(rows, highlightKeys, OPTIONS);

    expect(phone(view).highlights).toEqual([
      "Slow Horses",
      "Silo",
      "One Battle After Another",
    ]);
    expect(desktop(view).sections).toEqual([
      { label: "Summer", rows: ["Sinners", "Andor", "The Pitt"] },
    ]);
  });

  it("drops a section from the desktop when its rows are all highlighted there", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("listening");
    const view = buildMediaView(rows, highlightKeys, OPTIONS);

    expect(phone(view)).toEqual({
      highlights: ["Promises", "Hard Fork", "In Rainbows"],
      sections: [
        { label: "Fall", rows: ["Acquired"] },
        {
          label: "Summer",
          rows: ["Blonde", "The Rest Is History", "Titanic Rising"],
        },
      ],
    });
    expect(desktop(view)).toEqual({
      highlights: [
        "Promises",
        "Hard Fork",
        "In Rainbows",
        "Acquired",
        "Blonde",
      ],
      sections: [
        { label: "Summer", rows: ["The Rest Is History", "Titanic Rising"] },
      ],
    });
  });

  it("shows the plain list under a search or a type filter", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("reading");

    const searched = buildMediaView(rows, highlightKeys, {
      ...OPTIONS,
      q: "trust",
    });
    expect(titles(searched)).toEqual({
      highlights: [],
      sections: [{ label: "Summer", rows: ["Reflections on Trusting Trust"] }],
    });

    const books = buildMediaView(rows, highlightKeys, {
      ...OPTIONS,
      type: "Book",
    });
    expect(books.highlights).toEqual([]);
    expect(books.count).toBe(3);
  });

  it("matches notes, which the row renders", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("reading");
    const view = buildMediaView(rows, highlightKeys, {
      ...OPTIONS,
      q: "matter annotation",
    });
    expect(titles(view).sections[0]?.rows).toEqual(["The Web We Lost"]);
  });

  it("is empty when nothing matches", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("reading");
    const view = buildMediaView(rows, highlightKeys, {
      ...OPTIONS,
      q: "gardening",
    });
    expect(view).toMatchObject({ empty: true, count: 0, sections: [] });
  });

  it("names a season's year once it isn't this one, and opens winter in December", () => {
    const row = { type: "Book", url: "https://example.com", via: "x" };
    const view = buildMediaView(
      [
        { ...row, key: "a", title: "A", day: "2026-12-02" },
        { ...row, key: "b", title: "B", day: "2026-11-30" },
      ],
      [],
      { ...OPTIONS, thisYear: "2026" },
    );
    expect(view.sections.map((s) => s.label)).toEqual(["Winter 2027", "Fall"]);
  });
});

describe("filters in the URL", () => {
  const types = category("watching").types ?? [];

  it("reads a type by its plural label", () => {
    expect(
      filtersFromUrl(new URL("https://x/watching?type=Movies&q=bear"), types),
    ).toEqual({ q: "bear", type: "Movie" });
    expect(
      filtersFromUrl(new URL("https://x/watching?type=books"), types).type,
    ).toBe("");
  });

  it("writes them back, keeping other parameters", () => {
    expect(
      searchWithFilters("?utm=1&type=shows", types, { q: "", type: "Movie" }),
    ).toBe("?utm=1&type=movies");
    expect(searchWithFilters("?q=x", types, { q: "", type: "" })).toBe("");
  });
});
