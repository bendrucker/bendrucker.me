import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { syncActivity } from "@/activity/sync";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import { makeIssue, makePullRequest, makeRepo } from "@/test/repos";
import { queryCodeRows, queryProject, queryRepo } from "./query";

const activity = (prCount: number) => ({
  prCount,
  reviewCount: 0,
  issueCount: 0,
  mergeCount: 0,
  hasMergedPRs: true,
});

const org = (name: string, overrides: Parameters<typeof makeRepo>[0] = {}) =>
  makeRepo({
    owner: "terraform-linters",
    name,
    url: `https://github.com/terraform-linters/${name}`,
    ...overrides,
  });

const REPOS = [
  makeRepo({ lastActivity: new Date("2025-06-01T00:00:00Z") }),
  org("tflint", {
    lastActivity: new Date("2025-05-30T00:00:00Z"),
    stargazerCount: 5000,
    activitySummary: activity(1),
  }),
  org("tflint-ruleset-aws", {
    lastActivity: new Date("2025-02-01T00:00:00Z"),
    stargazerCount: 300,
    activitySummary: activity(0),
  }),
  makeRepo({
    owner: "someone",
    name: "solo",
    lastActivity: new Date("2025-05-16T00:00:00Z"),
  }),
];

const TFLINT = { owner: "terraform-linters", name: "tflint" };

const WORK = {
  pullRequests: [
    makePullRequest({
      id: "PR_new",
      number: 12,
      createdAt: new Date("2025-05-20T00:00:00Z"),
      state: "MERGED",
      mergedAt: new Date("2025-05-21T00:00:00Z"),
    }),
    makePullRequest({
      id: "PR_old",
      number: 3,
      createdAt: new Date("2025-01-10T00:00:00Z"),
    }),
    makePullRequest({
      id: "PR_tflint",
      repository: TFLINT,
      number: 40,
      createdAt: new Date("2024-03-01T00:00:00Z"),
      state: "MERGED",
      mergedAt: new Date("2024-03-02T00:00:00Z"),
    }),
  ],
  issues: [
    makeIssue({
      id: "I_new",
      number: 13,
      createdAt: new Date("2025-05-25T00:00:00Z"),
    }),
    makeIssue({
      id: "I_aws",
      repository: { ...TFLINT, name: "tflint-ruleset-aws" },
      number: 7,
      createdAt: new Date("2023-08-01T00:00:00Z"),
      state: "CLOSED",
      stateReason: "NOT_PLANNED",
    }),
  ],
};

describe("code queries", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = createTestDb();
    await syncActivity(testStore(db), REPOS, { work: WORK });
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("queryCodeRows", () => {
    const window = { from: new Date("2025-05-15T00:00:00Z") };

    it("lists the window's repositories, most recently touched first", async () => {
      const rows = await queryCodeRows(db, window);

      expect(rows.map((row) => row.repo)).toEqual([
        "bendrucker/cool-lib",
        "terraform-linters/tflint",
        "someone/solo",
      ]);
    });

    it("carries only the work opened inside the window", async () => {
      const [coolLib, tflint] = await queryCodeRows(db, window);

      expect(coolLib.pulls.map((pr) => pr.id)).toEqual(["PR_new"]);
      expect(coolLib.issues.map((issue) => issue.id)).toEqual(["I_new"]);
      expect(tflint.pulls).toEqual([]);
    });

    it("reads a row back in the shape the pages take", async () => {
      const [coolLib] = await queryCodeRows(db, window);

      expect(coolLib).toMatchObject({
        owner: "bendrucker",
        name: "cool-lib",
        mine: true,
        stars: 100,
        lastActivity: "2025-06-01T00:00:00.000Z",
        language: { name: "TypeScript", color: "#3178c6", extension: null },
      });
      expect(coolLib.pulls[0]).toEqual({
        id: "PR_new",
        repo: "bendrucker/cool-lib",
        number: 12,
        title: "Add a thing",
        url: "https://github.com/bendrucker/cool-lib/pull/12",
        state: "MERGED",
        isDraft: false,
        createdAt: "2025-05-20T00:00:00.000Z",
        mergedAt: "2025-05-21T00:00:00.000Z",
        additions: 40,
        deletions: 10,
        reactions: 0,
      });
      expect(coolLib.issues[0].url).toBe(
        "https://github.com/bendrucker/cool-lib/issues/13",
      );
    });
  });

  describe("queryRepo", () => {
    it("carries every stored pull request and issue, newest first", async () => {
      const page = await queryRepo(db, "bendrucker", "cool-lib");

      expect(page?.repo.pulls.map((pr) => pr.id)).toEqual(["PR_new", "PR_old"]);
      expect(page?.repo.issues.map((issue) => issue.id)).toEqual(["I_new"]);
    });

    it("scores the repository by its best pull request", async () => {
      const page = await queryRepo(db, "terraform-linters", "tflint");

      // log1p(5000) + 0.5 log1p(50) + 0.5 for the merge.
      expect(page?.repo.score).toBeCloseTo(
        Math.log1p(5000) + 0.5 * Math.log1p(50) + 0.5,
        12,
      );
    });

    // The yearly count says five pull requests where two rows are stored,
    // which is what a window without a backfill leaves.
    it("counts the larger of the stored rows and the yearly counts", async () => {
      const page = await queryRepo(db, "bendrucker", "cool-lib");

      expect(page?.stats).toEqual({
        stars: 100,
        prs: 5,
        prsCapped: false,
        issues: 1,
        since: "2020-01-01T00:00:00.000Z",
      });
    });

    it("counts a year stored at a full page of pull requests as a floor", async () => {
      await syncActivity(testStore(db), [
        makeRepo({ name: "busy", activitySummary: activity(100) }),
      ]);

      const page = await queryRepo(db, "bendrucker", "busy");

      expect(page?.stats).toMatchObject({ prs: 100, prsCapped: true });
    });

    it("dates someone else's repository from the first contribution", async () => {
      const page = await queryRepo(db, "terraform-linters", "tflint");

      expect(page?.stats).toEqual({
        stars: 5000,
        prs: 1,
        prsCapped: false,
        issues: 0,
        since: "2024-03-01T00:00:00.000Z",
      });
    });

    it("is null for a repository with nothing stored", async () => {
      expect(await queryRepo(db, "bendrucker", "missing")).toBeNull();
    });
  });

  describe("queryProject", () => {
    it("rolls an organization up over everything stored for it", async () => {
      const page = await queryProject(db, "terraform-linters");

      expect(page?.project).toMatchObject({
        id: "terraform-linters",
        title: "TFLint",
        org: "terraform-linters",
      });
      expect(page?.project.members.map((member) => member.name)).toEqual([
        "tflint",
        "tflint-ruleset-aws",
      ]);
      expect(page?.stats).toEqual({
        prs: 1,
        prsCapped: false,
        issues: 1,
        repositories: 2,
        since: "2023-08-01T00:00:00.000Z",
      });
    });

    it("finds a configured family of the owner's repositories", async () => {
      await syncActivity(testStore(db), [
        makeRepo({ name: "creditcards" }),
        makeRepo({ name: "creditcards-types" }),
      ]);

      const page = await queryProject(db, "creditcards");

      expect(page?.project.members).toHaveLength(2);
      expect(page?.stats.repositories).toBe(2);
    });

    it("reads an id as an organization alone when told there are no families", async () => {
      await syncActivity(testStore(db), [
        makeRepo({ name: "creditcards" }),
        makeRepo({ name: "creditcards-types" }),
      ]);

      expect(
        await queryProject(db, "creditcards", { configured: [] }),
      ).toBeNull();
      expect(
        (await queryProject(db, "terraform-linters", { configured: [] }))
          ?.project.title,
      ).toBe("TFLint");
    });

    it.each(["someone", "bendrucker", "nobody"])(
      "is null for %s, which is not a project",
      async (id) => {
        expect(await queryProject(db, id)).toBeNull();
      },
    );
  });
});
