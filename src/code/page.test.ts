import { describe, expect, it } from "vitest";
import { codeRepo, issue, pull } from "@/test/code";
import {
  memberHref,
  monthYear,
  moreUrl,
  parentProject,
  projectStatTiles,
  repoStatTiles,
  workList,
} from "./page";

describe("workList", () => {
  const repo = codeRepo("bendrucker/cool-lib", {
    pulls: [
      pull("merged", "2026-09-10T00:00:00Z"),
      pull("draft", "2026-09-12T00:00:00Z", {
        state: "OPEN",
        isDraft: true,
        mergedAt: null,
      }),
      pull("closed", "2026-08-01T00:00:00Z", {
        state: "CLOSED",
        mergedAt: null,
      }),
    ],
    issues: [
      issue("open", "2026-09-11T00:00:00Z"),
      issue("dropped", "2026-07-01T00:00:00Z", {
        state: "CLOSED",
        stateReason: "NOT_PLANNED",
      }),
      issue("fixed", "2026-06-01T00:00:00Z", {
        state: "CLOSED",
        stateReason: "COMPLETED",
      }),
    ],
  });

  it("interleaves pull requests and issues, newest first", () => {
    expect(workList([repo]).items.map((item) => [item.id, item.state])).toEqual(
      [
        ["draft", "DRAFT"],
        ["open", "ISSUE_OPEN"],
        ["merged", "MERGED"],
        ["closed", "CLOSED"],
        ["dropped", "ISSUE_NOT_PLANNED"],
        ["fixed", "ISSUE_DONE"],
      ],
    );
  });

  it("stops at the limit and says there is more", () => {
    const list = workList([repo], { shown: 4 });

    expect(list.items).toHaveLength(4);
    expect(list.more).toBe(true);
    expect(workList([repo]).more).toBe(false);
  });

  it("names each item's repository across a project", () => {
    const other = codeRepo("bendrucker/other", {
      pulls: [pull("elsewhere", "2026-09-30T00:00:00Z")],
    });
    const [first, second] = workList([repo, other], { withRepo: true }).items;

    expect(first).toMatchObject({ id: "elsewhere", repo: "other" });
    expect(second).toMatchObject({ id: "draft", repo: "cool-lib" });
    expect(workList([repo]).items[0]).not.toHaveProperty("repo");
  });
});

describe("moreUrl", () => {
  it("searches one owner's organization", () => {
    expect(moreUrl({ org: "terraform-linters" }, "bendrucker")).toBe(
      "https://github.com/search?type=issues&q=org%3Aterraform-linters+author%3Abendrucker",
    );
  });

  it("searches a list of repositories", () => {
    expect(
      moreUrl({ repos: ["bendrucker/a", "bendrucker/b"] }, "bendrucker"),
    ).toBe(
      "https://github.com/search?type=issues&q=repo%3Abendrucker%2Fa+repo%3Abendrucker%2Fb+author%3Abendrucker",
    );
  });
});

describe("stat tiles", () => {
  it("dates since by month", () => {
    expect(monthYear("2014-08-03T00:00:00.000Z")).toBe("Aug 2014");
  });

  it("gives a repository stars, pull requests, and since, and issues only once there are some", () => {
    expect(
      repoStatTiles({
        stars: 1234,
        prs: 5,
        prsCapped: false,
        issues: 0,
        issuesCapped: false,
        since: "2020-01-01T00:00:00.000Z",
      }).map((tile) => [tile.label, tile.value]),
    ).toEqual([
      ["stars", "1,234"],
      ["pull requests", "5"],
      ["since", "Jan 2020"],
    ]);
  });

  it("leaves out a count that is zero", () => {
    expect(
      repoStatTiles({
        stars: 0,
        prs: 0,
        prsCapped: false,
        issues: 0,
        issuesCapped: false,
        since: "2020-01-01T00:00:00.000Z",
      }).map((tile) => tile.label),
    ).toEqual(["since"]);
  });

  it("marks a pull request count that is only a floor", () => {
    const [prs] = projectStatTiles({
      prs: 1100,
      prsCapped: true,
      issues: 0,
      issuesCapped: false,
      repositories: 2,
      since: null,
    });
    expect(prs?.value).toBe("1,100+");
  });

  it("marks an issue count that is only a floor", () => {
    const [, issues] = projectStatTiles({
      prs: 4,
      prsCapped: false,
      issues: 100,
      issuesCapped: true,
      repositories: 2,
      since: null,
    });
    expect(issues).toMatchObject({ label: "issues", value: "100+" });
  });

  it("gives a project repositories in place of stars", () => {
    expect(
      projectStatTiles({
        prs: 40,
        prsCapped: false,
        issues: 3,
        issuesCapped: false,
        repositories: 7,
        since: null,
      }).map((tile) => tile.label),
    ).toEqual(["pull requests", "issues", "repositories"]);
  });
});

describe("parentProject", () => {
  const tflint = codeRepo("terraform-linters/tflint");
  const cards = codeRepo("bendrucker/creditcards");

  it("returns to the organization a member was opened from", () => {
    expect(parentProject(tflint, "terraform-linters")).toEqual({
      id: "terraform-linters",
      title: "TFLint",
    });
  });

  it("returns to a configured family holding the repository", () => {
    expect(parentProject(cards, "creditcards")).toEqual({
      id: "creditcards",
      title: "creditcards",
    });
  });

  it.each([
    ["no from", tflint, null],
    ["a project not holding it", tflint, "creditcards"],
    ["the site owner's own login", cards, "bendrucker"],
    ["an unknown id", cards, "anything"],
  ])("ignores %s", (_, repo, from) => {
    expect(parentProject(repo, from)).toBeUndefined();
  });
});

describe("memberHref", () => {
  it("carries the project the link came from", () => {
    expect(
      memberHref(codeRepo("terraform-linters/tflint"), "terraform-linters"),
    ).toBe("/code/terraform-linters/tflint?from=terraform-linters");
  });
});
