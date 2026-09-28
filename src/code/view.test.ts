import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  codeView,
  countLabel,
  gutterCopies,
  highlightMarks,
  filterRows,
  filterSearch,
  isDefault,
  parseFilters,
  rankHighlights,
  transitionName,
  withFilters,
  type CodeRow,
} from "./view";

function row(key: string, overrides: Partial<CodeRow> = {}): CodeRow {
  return {
    key,
    href: `/code/${key}`,
    title: key.split("/").at(-1) ?? key,
    org: "",
    text: "",
    lead: "dot",
    dot: "#3178c6",
    mine: true,
    langs: ["TypeScript"],
    day: "2026-09-01",
    score: 0,
    activity: 0,
    ...overrides,
  };
}

const THIS_YEAR = { thisYear: "2026" };

/** Each month row's key, and whether only a phone lists it. */
function listed(view: ReturnType<typeof codeView>) {
  return view.sections.flatMap((section) =>
    section.weeks.flatMap((week) =>
      week.rows.map(({ item }) => [item.key, item.phoneOnly]),
    ),
  );
}

describe("parseFilters", () => {
  it("reads every filter from the URL", () => {
    expect(
      parseFilters(
        new URLSearchParams("q=lint&owner=others&lang=Go&sort=active"),
      ),
    ).toEqual({ q: "lint", owner: "others", lang: "Go", sort: "active" });
  });

  it("falls back to the default for a value it doesn't know", () => {
    expect(
      parseFilters(new URLSearchParams("owner=everyone&sort=stars")),
    ).toEqual(DEFAULT_FILTERS);
  });
});

describe("filterSearch", () => {
  it("leaves every default out", () => {
    expect(filterSearch(DEFAULT_FILTERS)).toBe("");
  });

  it("round-trips through parseFilters", () => {
    const filters = {
      q: "tf lint",
      owner: "mine",
      lang: "C#",
      sort: "name",
    } as const;
    const search = filterSearch(filters);

    expect(search).toBe("?q=tf+lint&owner=mine&lang=C%23&sort=name");
    expect(parseFilters(new URLSearchParams(search))).toEqual(filters);
  });

  it("drops a query of only spaces", () => {
    expect(filterSearch({ ...DEFAULT_FILTERS, q: "  " })).toBe("");
  });
});

describe("withFilters", () => {
  it("replaces the filters and keeps every other parameter", () => {
    expect(
      withFilters("?storyId=code&q=old&sort=name", {
        ...DEFAULT_FILTERS,
        lang: "Go",
      }),
    ).toBe("?storyId=code&lang=Go");
    expect(withFilters("?q=old", DEFAULT_FILTERS)).toBe("");
  });
});

describe("isDefault", () => {
  it("is false once any filter is set", () => {
    expect(isDefault(DEFAULT_FILTERS)).toBe(true);
    expect(isDefault({ ...DEFAULT_FILTERS, sort: "name" })).toBe(false);
    expect(isDefault({ ...DEFAULT_FILTERS, lang: "Go" })).toBe(false);
  });
});

describe("filterRows", () => {
  const rows = [
    row("bendrucker/cool-lib"),
    row("terraform-linters/tflint", {
      mine: false,
      org: "terraform-linters",
      langs: ["Go"],
    }),
    row("pydantic", {
      lead: "ring",
      mine: false,
      text: "pydantic-core, logfire",
      langs: ["Python", "Rust"],
    }),
  ];

  it("splits by owner", () => {
    const keys = (owner: "mine" | "others") =>
      filterRows(rows, { ...DEFAULT_FILTERS, owner }).map((r) => r.key);

    expect(keys("mine")).toEqual(["bendrucker/cool-lib"]);
    expect(keys("others")).toEqual(["terraform-linters/tflint", "pydantic"]);
  });

  it("matches a project by any of its members' languages", () => {
    expect(
      filterRows(rows, { ...DEFAULT_FILTERS, lang: "Rust" }).map((r) => r.key),
    ).toEqual(["pydantic"]);
  });

  it("searches the org and a project's members", () => {
    const hits = (q: string) =>
      filterRows(rows, { ...DEFAULT_FILTERS, q }).map((r) => r.key);

    expect(hits("linters")).toEqual(["terraform-linters/tflint"]);
    expect(hits("logfire")).toEqual(["pydantic"]);
  });
});

describe("rankHighlights", () => {
  it("leads with the strongest and never with a row scoring nothing", () => {
    const rows = [
      row("a", { score: 2 }),
      row("b", { score: 0 }),
      row("c", { score: 9 }),
    ];

    expect(rankHighlights(rows).map((r) => r.key)).toEqual(["c", "a"]);
  });
});

describe("codeView", () => {
  const rows = [
    row("r1", { day: "2026-09-20", score: 1 }),
    row("r2", { day: "2026-09-18", score: 7 }),
    row("r3", { day: "2026-09-02", score: 6 }),
    row("r4", { day: "2026-08-30", score: 5 }),
    row("r5", { day: "2026-08-12", score: 4 }),
    row("r6", { day: "2026-07-01", score: 3 }),
    row("r7", { day: "2026-07-01", score: 0 }),
  ];

  it("leads the default list with five highlights", () => {
    const view = codeView(rows, DEFAULT_FILTERS, THIS_YEAR);

    expect(view.highlights.map((r) => r.key)).toEqual([
      "r2",
      "r3",
      "r4",
      "r5",
      "r6",
    ]);
    expect(view.count).toBe(7);
  });

  // A phone hides the fourth and fifth highlights, so they list in their
  // months there and only there.
  it("lists the highlights a phone hides in their months, for a phone only", () => {
    const view = codeView(rows, DEFAULT_FILTERS, THIS_YEAR);

    expect(listed(view)).toEqual([
      ["r1", false],
      ["r5", true],
      ["r6", true],
      ["r7", false],
    ]);
  });

  // r6 is the fifth highlight, so a desktop skips it and r7, on the same day,
  // becomes the first row it dates. r5, the fourth, is all August holds, so a
  // desktop hides that month entirely.
  it("dates and ends each week by the rows a desktop shows", () => {
    const view = codeView(rows, DEFAULT_FILTERS, THIS_YEAR);
    const marks = view.sections.flatMap((section) =>
      section.weeks.flatMap((week) =>
        week.rows.map(({ item }) => ({
          key: item.key,
          phone: item.phone,
          desktop: item.desktop,
        })),
      ),
    );

    expect(marks.find((mark) => mark.key === "r6")).toEqual({
      key: "r6",
      phone: { showDay: true, weekEnd: false },
      desktop: { showDay: false, weekEnd: false },
    });
    expect(marks.find((mark) => mark.key === "r7")).toEqual({
      key: "r7",
      phone: { showDay: false, weekEnd: true },
      desktop: { showDay: true, weekEnd: true },
    });
    expect(view.sections.map((section) => section.phoneOnly)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("drops the highlights once anything is filtered", () => {
    const view = codeView(rows, { ...DEFAULT_FILTERS, q: "r" }, THIS_YEAR);

    expect(view.highlights).toEqual([]);
    expect(listed(view)).toHaveLength(7);
    expect(listed(view).every(([, phoneOnly]) => phoneOnly === false)).toBe(
      true,
    );
  });

  it("groups by month, newest first", () => {
    const view = codeView(
      rows,
      { ...DEFAULT_FILTERS, lang: "TypeScript" },
      THIS_YEAR,
    );

    expect(view.sections.map((section) => section.label)).toEqual([
      "September",
      "August",
      "July",
    ]);
  });

  it("flattens any other sort into one run, each row dated", () => {
    const view = codeView(
      [
        row("b", { activity: 3, day: "2026-09-04" }),
        row("a", { activity: 9, day: "2026-08-10" }),
      ],
      { ...DEFAULT_FILTERS, sort: "active" },
      THIS_YEAR,
    );

    expect(view.sections).toEqual([]);
    expect(view.highlights).toEqual([]);
    expect(
      view.sorted.map(({ item, showDay, dayNum, sub }) => [
        item.key,
        showDay,
        dayNum,
        sub,
      ]),
    ).toEqual([
      ["a", true, "10", "aug"],
      ["b", true, "4", "sep"],
    ]);
  });

  it("sorts by name regardless of case", () => {
    const view = codeView(
      [row("x/zeta"), row("x/Alpha"), row("x/beta")],
      { ...DEFAULT_FILTERS, sort: "name" },
      THIS_YEAR,
    );

    expect(view.sorted.map(({ item }) => item.title)).toEqual([
      "Alpha",
      "beta",
      "zeta",
    ]);
  });
});

describe("gutterCopies", () => {
  const plain = { showDay: true, weekEnd: false };

  it("draws one gutter when both widths agree", () => {
    expect(gutterCopies(plain, { ...plain })).toEqual([
      { key: "both", marks: plain, class: "" },
    ]);
  });

  it("draws one per width when they differ", () => {
    const desktop = { showDay: false, weekEnd: false };

    expect(
      gutterCopies(plain, desktop).map((copy) => [copy.class, copy.marks]),
    ).toEqual([
      ["md:hidden", plain],
      ["max-md:hidden", desktop],
    ]);
  });
});

describe("highlightMarks", () => {
  it("stops the line under the third highlight on a phone and the fifth on a desktop", () => {
    expect(highlightMarks(2, 5)).toEqual({
      phone: { showDay: true, weekEnd: true },
      desktop: { showDay: true, weekEnd: false },
    });
    expect(highlightMarks(4, 5).desktop.weekEnd).toBe(true);
    expect(highlightMarks(1, 2).phone.weekEnd).toBe(true);
  });
});

describe("countLabel", () => {
  it("counts repositories", () => {
    expect(countLabel(1)).toBe("1 repository");
    expect(countLabel(0)).toBe("0 repositories");
  });
});

describe("transitionName", () => {
  it("makes a CSS identifier of a repository's key", () => {
    expect(transitionName("terraform-linters/tflint.nvim")).toBe(
      "code-terraform-linters_tflint_nvim",
    );
  });
});
