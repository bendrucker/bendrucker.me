import { describe, expect, it } from "vitest";
import {
  groupRows,
  monthShort,
  seasonOf,
  sectionLabel,
  showDay,
  weekOf,
  type GroupMode,
} from "./sections";

const opts = { thisYear: "2026" };

describe("seasonOf", () => {
  it.each<{ name: string; day: string; season: string }>([
    {
      name: "December opens next year's winter",
      day: "2025-12-03",
      season: "2026-0",
    },
    {
      name: "January stays in its own winter",
      day: "2026-01-15",
      season: "2026-0",
    },
    { name: "February ends winter", day: "2026-02-28", season: "2026-0" },
    { name: "March starts spring", day: "2026-03-01", season: "2026-1" },
    { name: "May ends spring", day: "2026-05-31", season: "2026-1" },
    { name: "June starts summer", day: "2026-06-01", season: "2026-2" },
    { name: "August ends summer", day: "2026-08-31", season: "2026-2" },
    { name: "September starts fall", day: "2026-09-01", season: "2026-3" },
    { name: "November ends fall", day: "2026-11-30", season: "2026-3" },
  ])("$name", ({ day, season }) => {
    expect(seasonOf(day)).toBe(season);
  });
});

describe("weekOf", () => {
  it("starts a week on Monday", () => {
    expect(weekOf("2026-09-23")).toBe("2026-09-21");
    expect(weekOf("2026-09-21")).toBe("2026-09-21");
  });

  it("keeps a Sunday in the week before it", () => {
    expect(weekOf("2026-09-27")).toBe("2026-09-21");
  });

  it("crosses a year boundary", () => {
    expect(weekOf("2027-01-01")).toBe("2026-12-28");
  });
});

describe("monthShort", () => {
  it("abbreviates the month in lowercase", () => {
    expect(monthShort("2014-02-19")).toBe("feb");
  });
});

describe("showDay", () => {
  it("shows the first row of a day", () => {
    expect(showDay("2026-09-23", undefined)).toBe(true);
    expect(showDay("2026-09-23", "2026-09-24")).toBe(true);
  });

  it("leaves a second row the same day blank", () => {
    expect(showDay("2026-09-23", "2026-09-23")).toBe(false);
  });
});

describe("sectionLabel", () => {
  it.each<{ name: string; key: string; mode: GroupMode; label: string }>([
    {
      name: "a month of this year alone",
      key: "2026-09",
      mode: "month",
      label: "September",
    },
    {
      name: "a month of another year with it",
      key: "2025-12",
      mode: "month",
      label: "December 2025",
    },
    {
      name: "a season of this year alone",
      key: "2026-3",
      mode: "season",
      label: "Fall",
    },
    {
      name: "a season of another year with it",
      key: "2027-0",
      mode: "season",
      label: "Winter 2027",
    },
    { name: "a year as the year", key: "2014", mode: "year", label: "2014" },
  ])("names $name", ({ key, mode, label }) => {
    expect(sectionLabel(key, mode, opts)).toBe(label);
  });
});

describe("groupRows", () => {
  const rides = [
    { day: "2026-09-23", title: "Boot Camp" },
    { day: "2026-09-23", title: "Cinderella" },
    { day: "2026-09-20", title: "Richfield" },
    { day: "2026-08-30", title: "Headlands" },
  ];

  it("groups by month, newest first", () => {
    const sections = groupRows(rides, "month", opts);
    expect(sections.map((s) => [s.key, s.label])).toEqual([
      ["2026-09", "September"],
      ["2026-08", "August"],
    ]);
  });

  it("breaks a month into weeks", () => {
    const [september] = groupRows(rides, "month", opts);
    expect(september?.weeks.map((w) => w.key)).toEqual([
      "2026-09-21",
      "2026-09-14",
    ]);
    expect(september?.weeks[0]?.rows.map((r) => r.item.title)).toEqual([
      "Boot Camp",
      "Cinderella",
    ]);
  });

  it("shows each day once, on its first row", () => {
    const rows = groupRows(rides, "month", opts).flatMap((s) =>
      s.weeks.flatMap((w) => w.rows),
    );
    expect(rows.map((r) => [r.dayNum, r.showDay])).toEqual([
      ["23", true],
      ["23", false],
      ["20", true],
      ["30", true],
    ]);
  });

  it("gives a month section's gutter no month", () => {
    const [september] = groupRows(rides, "month", opts);
    expect(september?.weeks[0]?.rows[0]?.sub).toBeUndefined();
  });

  it("groups posts by year and puts the month under the day", () => {
    const posts = [
      { day: "2015-03-02" },
      { day: "2014-02-19" },
      { day: "2014-01-07" },
    ];
    const sections = groupRows(posts, "year", opts);
    expect(sections.map((s) => s.label)).toEqual(["2015", "2014"]);
    expect(sections[1]?.weeks.flatMap((w) => w.rows.map((r) => r.sub))).toEqual(
      ["feb", "jan"],
    );
  });

  it("groups media by season as one run of rows", () => {
    const media = [
      { day: "2026-09-10" },
      { day: "2026-08-30" },
      { day: "2026-07-05" },
      { day: "2025-12-20" },
      { day: "2025-11-02" },
    ];
    const sections = groupRows(media, "season", opts);
    expect(sections.map((s) => s.label)).toEqual([
      "Fall",
      "Summer",
      "Winter",
      "Fall 2025",
    ]);
    expect(sections.map((s) => s.weeks.length)).toEqual([1, 1, 1, 1]);
    expect(sections[1]?.weeks[0]?.rows).toHaveLength(2);
  });

  it("returns nothing for no rows", () => {
    expect(groupRows([], "month", opts)).toEqual([]);
  });
});
