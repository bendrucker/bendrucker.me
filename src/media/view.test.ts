import { describe, expect, it } from "vitest";
import { category } from "@/categories";
import { loadMediaFeed } from "./load";
import type { MediaRow } from "./types";
import {
  buildMediaView,
  filtersFromUrl,
  searchWithFilters,
  type MediaView,
} from "./view";

const OPTIONS = { q: "", type: "", thisYear: "2026" };

/** A bare row, enough for the filters to read. */
function bareRow(key: string, type: string, active?: boolean): MediaRow {
  return {
    key,
    type,
    title: key,
    day: "2026-09-01",
    url: `https://example.com/${key}`,
    via: "Trakt",
    ...(active && { active }),
  };
}

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

    expect(phone(view).highlights).toEqual([
      "The Web We Lost",
      "The Bitter Lesson",
      "The Overstory",
    ]);
    expect(phone(view).sections[0]).toEqual({
      label: "Fall",
      rows: [
        "Breakneck",
        "Piranesi",
        "The Ministry of Time",
        "Local-first software",
      ],
    });
    expect(desktop(view).highlights.slice(3)).toEqual([
      "James",
      "Gödel, Escher, Bach: An Eternal Golden Braid",
    ]);
  });

  it("narrows Watching to the shows mid-season", () => {
    const rows = [
      bareRow("Silo", "Show", true),
      bareRow("Severance", "Show"),
      bareRow("Sinners", "Movie"),
    ];
    const view = buildMediaView(rows, [], { ...OPTIONS, type: "Active" });
    const listed = view.sections.flatMap((s) =>
      s.weeks.flatMap((w) => w.rows.map((r) => r.item.title)),
    );

    expect(listed).toEqual(["Silo"]);
    const types = category("watching").types ?? [];
    expect(
      filtersFromUrl(new URL("https://x.test/watching/?type=active"), types),
    ).toEqual({ q: "", type: "Active" });
  });

  it("leads Watching with the latest watched", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("watching");
    const view = buildMediaView(rows, highlightKeys, OPTIONS);

    expect(phone(view).highlights).toEqual([
      "The Pitt",
      "Slow Horses",
      "Abbott Elementary",
    ]);
    expect(desktop(view).sections[0]).toEqual({
      label: "Fall",
      rows: ["The Simpsons", "Bugonia"],
    });
  });

  it("drops a section from the desktop when its rows are all highlighted there", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("listening");
    const view = buildMediaView(rows, highlightKeys, OPTIONS);

    // Cowboy Carter is the fifth highlight and all Spring 2024 holds.
    expect(desktop(view).highlights.at(-1)).toBe("Cowboy Carter");
    expect(phone(view).sections.find((s) => s.label === "Spring 2024")).toEqual(
      { label: "Spring 2024", rows: ["Cowboy Carter"] },
    );
    expect(desktop(view).sections.map((s) => s.label)).not.toContain(
      "Spring 2024",
    );
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
    expect(books.count).toBe(22);
  });

  it("matches notes, which the row renders", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("reading");
    const view = buildMediaView(rows, highlightKeys, {
      ...OPTIONS,
      q: "matter annotation",
    });
    expect(titles(view).sections.flatMap((s) => s.rows)).toEqual([
      "The Web We Lost",
      "The Bitter Lesson",
      "Do Things that Don't Scale",
      "The Tyranny of Structurelessness",
    ]);
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
