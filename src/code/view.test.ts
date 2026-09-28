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
  type CodeMember,
  type CodeRow,
  type LanguageOption,
} from "./view";

const PYTHON = "#3572A5";
const RUST = "#dea584";

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
    members: [],
    ...overrides,
  };
}

function member(
  key: string,
  lang: string,
  day: string,
  activity: number,
  overrides: Partial<CodeMember> = {},
): CodeMember {
  return {
    key,
    href: `/code/${key}`,
    title: key.split("/").at(-1) ?? key,
    text: "",
    dot: lang === "Rust" ? RUST : PYTHON,
    lang,
    day,
    activity,
    ...overrides,
  };
}

const LANGUAGES: LanguageOption[] = [
  { value: "Go", label: "Go", color: "#00ADD8" },
  { value: "C", label: "C", color: "#555555" },
  { value: "C#", label: "C#", color: "#178600" },
];

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
        LANGUAGES,
      ),
    ).toEqual({ q: "lint", owner: "others", lang: "Go", sort: "active" });
  });

  it("falls back to the default for a value it doesn't know", () => {
    expect(
      parseFilters(
        new URLSearchParams("owner=everyone&sort=stars&lang=Klingon"),
        LANGUAGES,
      ),
    ).toEqual(DEFAULT_FILTERS);
  });

  it("reads a language in any case as the one the select offers", () => {
    const lang = (value: string) =>
      parseFilters(new URLSearchParams({ lang: value }), LANGUAGES).lang;

    expect(lang("go")).toBe("Go");
    expect(lang("c")).toBe("C");
    expect(lang("c#")).toBe("C#");
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
    expect(parseFilters(new URLSearchParams(search), LANGUAGES)).toEqual(
      filters,
    );
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
      org: "pydantic",
      text: "pydantic, pydantic-core, logfire",
      dot: PYTHON,
      langs: ["Python", "Rust"],
      day: "2026-09-12",
      activity: 6,
      members: [
        member("pydantic/pydantic", "Python", "2026-09-12", 3),
        member("pydantic/pydantic-core", "Rust", "2026-09-10", 2),
        member("pydantic/logfire", "Python", "2026-09-05", 1, {
          text: "Uncomplicated observability",
        }),
      ],
    }),
  ];

  it("splits by owner", () => {
    const keys = (owner: "mine" | "others") =>
      filterRows(rows, { ...DEFAULT_FILTERS, owner }).map((r) => r.key);

    expect(keys("mine")).toEqual(["bendrucker/cool-lib"]);
    expect(keys("others")).toEqual(["terraform-linters/tflint", "pydantic"]);
  });

  it("shows a project through its members in the language chosen", () => {
    const [project] = filterRows(rows, { ...DEFAULT_FILTERS, lang: "Python" });

    expect(project).toMatchObject({
      key: "pydantic",
      lead: "ring",
      text: "pydantic, logfire",
      dot: PYTHON,
      langs: ["Python"],
      day: "2026-09-12",
      activity: 4,
    });
    expect(project?.members.map((m) => m.key)).toEqual([
      "pydantic/pydantic",
      "pydantic/logfire",
    ]);
  });

  it("shows a project's lone match in a language as a repository", () => {
    expect(filterRows(rows, { ...DEFAULT_FILTERS, lang: "Rust" })).toEqual([
      expect.objectContaining({
        key: "pydantic/pydantic-core",
        href: "/code/pydantic/pydantic-core",
        title: "pydantic-core",
        org: "pydantic",
        lead: "dot",
        dot: RUST,
        langs: ["Rust"],
        day: "2026-09-10",
        members: [],
      }),
    ]);
  });

  it("keeps the most recent first once a project moves to an earlier day", () => {
    const [, , pydantic] = rows;
    const rustLast = {
      ...pydantic,
      day: "2026-09-20",
      members: pydantic.members.map((m) =>
        m.lang === "Rust" ? { ...m, day: "2026-09-20" } : m,
      ),
    };
    const between = row("between", { langs: ["Python"], day: "2026-09-15" });

    expect(
      filterRows([rustLast, between], {
        ...DEFAULT_FILTERS,
        lang: "Python",
      }).map((r) => [r.key, r.day]),
    ).toEqual([
      ["between", "2026-09-15"],
      ["pydantic", "2026-09-12"],
    ]);
  });

  it("searches the org and every member's name and description", () => {
    const hits = (q: string) =>
      filterRows(rows, { ...DEFAULT_FILTERS, q }).map((r) => r.key);

    expect(hits("linters")).toEqual(["terraform-linters/tflint"]);
    expect(hits("logfire")).toEqual(["pydantic"]);
    expect(hits("observability")).toEqual(["pydantic"]);
    expect(hits("pydantic-core")).toEqual(["pydantic"]);
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
