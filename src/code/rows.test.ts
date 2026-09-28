import { describe, expect, it } from "vitest";
import { codeRepo, pull } from "@/test/code";
import {
  UNKNOWN_LANGUAGE_COLOR,
  buildCodeRows,
  codeWindow,
  languageOptions,
  localDay,
} from "./rows";
import { memberSummary } from "./view";

const LA = "America/Los_Angeles";

describe("localDay", () => {
  it("dates an evening in Los Angeles by its own calendar", () => {
    expect(localDay("2026-09-02T03:30:00.000Z", LA)).toBe("2026-09-01");
    expect(localDay("2026-09-02T08:00:00.000Z", LA)).toBe("2026-09-02");
  });
});

describe("codeWindow", () => {
  it("reaches ninety days back", () => {
    expect(codeWindow(new Date("2026-09-27T00:00:00Z")).from).toEqual(
      new Date("2026-06-29T00:00:00Z"),
    );
  });
});

describe("memberSummary", () => {
  it("names up to three members and counts the rest", () => {
    expect(memberSummary(["a", "b"])).toBe("a, b");
    expect(memberSummary(["a", "b", "c"])).toBe("a, b, c");
    expect(memberSummary(["a", "b", "c", "d", "e"])).toBe("a, b, and 3 more");
  });
});

describe("buildCodeRows", () => {
  const repos = [
    codeRepo("bendrucker/cool-lib", {
      lastActivity: "2026-09-20T18:00:00.000Z",
      pulls: [pull("p1", "2026-09-19T00:00:00.000Z")],
    }),
    codeRepo("terraform-linters/tflint", {
      lastActivity: "2026-09-10T18:00:00.000Z",
      language: { name: "Go", color: "#00ADD8", extension: "go" },
      stars: 5000,
      pulls: [
        pull("p2", "2026-09-10T00:00:00.000Z"),
        pull("p3", "2026-09-09T00:00:00.000Z"),
      ],
    }),
    codeRepo("terraform-linters/tflint-ruleset-aws", {
      lastActivity: "2026-09-15T18:00:00.000Z",
      language: { name: "HCL", color: "#844FBA", extension: "hcl" },
      stars: 300,
    }),
    codeRepo("someone/solo", {
      lastActivity: "2026-09-12T18:00:00.000Z",
      language: null,
    }),
  ];

  const rows = buildCodeRows(repos, LA);

  it("folds an organization's repositories into one project row", () => {
    expect(rows.map((row) => row.key)).toEqual([
      "bendrucker/cool-lib",
      "terraform-linters",
      "someone/solo",
    ]);
  });

  it("describes a project by its members, strongest first", () => {
    const tflint = rows.find((row) => row.key === "terraform-linters");

    expect(tflint).toMatchObject({
      href: "/code/terraform-linters",
      title: "TFLint",
      org: "terraform-linters",
      text: "tflint, tflint-ruleset-aws",
      lead: "ring",
      dot: "#00ADD8",
      mine: false,
      langs: ["Go", "HCL"],
      day: "2026-09-15",
      activity: 2,
    });
  });

  it("names the owner of someone else's repository and not of the site's own", () => {
    const [coolLib] = rows;
    const solo = rows.at(-1);

    expect(coolLib).toMatchObject({
      href: "/code/bendrucker/cool-lib",
      title: "cool-lib",
      org: "",
      lead: "dot",
      activity: 1,
    });
    expect(solo).toMatchObject({
      org: "someone",
      dot: UNKNOWN_LANGUAGE_COLOR,
      langs: [],
      score: 0,
    });
  });
});

describe("languageOptions", () => {
  it("offers the most common language first", () => {
    const go = { name: "Go", color: "#00ADD8", extension: "go" };

    expect(
      languageOptions([
        codeRepo("a/one"),
        codeRepo("a/two", { language: go }),
        codeRepo("a/three", { language: go }),
        codeRepo("a/four", { language: null }),
      ]),
    ).toEqual([
      { value: "Go", label: "Go", color: "#00ADD8" },
      { value: "TypeScript", label: "TypeScript", color: "#3178c6" },
    ]);
  });
});
