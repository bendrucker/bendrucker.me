import { describe, expect, it } from "vitest";
import {
  assertSingleOwner,
  projectScore,
  projects,
  prScore,
  repoScore,
  type ProjectMember,
} from "./rank";

const pull = (
  overrides: Partial<Parameters<typeof prScore>[0]> = {},
): Parameters<typeof prScore>[0] => ({
  additions: 0,
  deletions: 0,
  reactions: 0,
  mergedAt: null,
  ...overrides,
});

// Expected values are the design.md §3 formula worked by hand:
// log1p(stars) + 0.5 log1p(min(size, 2000)) + 1.5 log1p(reactions) + 0.5 merged.
describe("prScore", () => {
  it("sums reach, size, reactions, and the merge", () => {
    const pr = pull({
      additions: 100,
      deletions: 50,
      reactions: 3,
      mergedAt: "2026-08-19T00:00:00Z",
    });

    expect(prScore(pr, 8594)).toBeCloseTo(14.147017377904248, 12);
  });

  it("caps the size at 2000 lines", () => {
    expect(prScore(pull({ additions: 4000, deletions: 1000 }), 0)).toBeCloseTo(
      3.8007011672918667,
      12,
    );
  });

  it("reads an open, empty pull request by its stars alone", () => {
    expect(prScore(pull(), 10)).toBeCloseTo(2.3978952727983707, 12);
  });
});

describe("repoScore", () => {
  it("takes the best pull request", () => {
    const pulls = [
      pull({ additions: 12, mergedAt: "2026-01-01T00:00:00Z" }),
      pull({ additions: 30 }),
    ];

    expect(repoScore({ stars: 100, pulls })).toBeCloseTo(6.397595195572028, 12);
  });

  it("is 0 with no pull requests", () => {
    expect(repoScore({ stars: 50_000, pulls: [] })).toBe(0);
  });
});

describe("projectScore", () => {
  it("lifts the best score by log1p of the rest", () => {
    expect(projectScore([2, 5, 1])).toBeCloseTo(6.386294361119891, 12);
  });

  it("is the one score alone", () => {
    expect(projectScore([4])).toBe(4);
  });

  it("is 0 with nothing to score", () => {
    expect(projectScore([])).toBe(0);
  });
});

const member = (
  repo: string,
  score: number,
  mine = repo.startsWith("bendrucker/"),
): ProjectMember => ({ repo, owner: repo.split("/")[0], mine, score });

describe("projects", () => {
  it("groups an organization holding two or more repositories", () => {
    const repos = [
      member("terraform-linters/tflint-ruleset-aws", 3),
      member("terraform-linters/tflint", 8),
      member("hashicorp/terraform", 9),
    ];

    expect(projects(repos, { configured: [] })).toEqual([
      {
        id: "terraform-linters",
        title: "TFLint",
        owner: "terraform-linters",
        org: "terraform-linters",
        mine: false,
        members: [repos[1], repos[0]],
        score: 8 + Math.log1p(3),
      },
    ]);
  });

  it("leaves the org off when the title already names it", () => {
    const repos = [member("oapi-codegen/a", 1), member("oapi-codegen/b", 2)];

    expect(projects(repos, { configured: [] })[0]).toMatchObject({
      title: "oapi-codegen",
      org: "",
    });
  });

  it("never groups the owner's own repositories by owner", () => {
    const repos = [member("bendrucker/a", 1), member("bendrucker/b", 2)];

    expect(projects(repos, { configured: [] })).toEqual([]);
  });

  it("groups a configured family of the owner's repositories", () => {
    const repos = [
      member("bendrucker/creditcards", 2),
      member("bendrucker/creditcards-types", 5),
      member("bendrucker/other", 9),
    ];

    expect(projects(repos)).toEqual([
      {
        id: "creditcards",
        title: "creditcards",
        owner: "bendrucker",
        org: "",
        mine: true,
        members: [repos[1], repos[0]],
        score: 5 + Math.log1p(2),
      },
    ]);
  });

  it("drops a family with only one member present", () => {
    expect(projects([member("bendrucker/creditcards", 2)])).toEqual([]);
  });
});

describe("assertSingleOwner", () => {
  it("throws on a family that crosses owners", () => {
    expect(() =>
      assertSingleOwner([
        { id: "tflint", title: "TFLint", repos: ["a/tflint", "b/plugin"] },
      ]),
    ).toThrow("project tflint crosses owners");
  });

  it("accepts a family under one owner", () => {
    expect(() =>
      assertSingleOwner([{ id: "x", title: "x", repos: ["a/one", "a/two"] }]),
    ).not.toThrow();
  });
});
