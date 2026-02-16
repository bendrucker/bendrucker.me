import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, type SeedRepo } from "@/test/db";
import {
  queryRepos,
  queryLanguages,
  queryYears,
  InvalidCursorError,
} from "./_query";

const LANGUAGE_EXTENSIONS = [
  { name: "TypeScript", extension: ".ts" },
  { name: "JavaScript", extension: ".js" },
  { name: "Go", extension: ".go" },
  { name: "Python", extension: ".py" },
];

const FIXTURES: SeedRepo[] = [
  {
    owner: "bendrucker",
    name: "cool-lib",
    description: "A cool library",
    primaryLanguageName: "TypeScript",
    primaryLanguageColor: "#3178c6",
    stargazerCount: 100,
    activity: [
      { lastActivity: 1718000000, prCount: 5, reviewCount: 2, issueCount: 1, mergeCount: 3, hasMergedPrs: 1 },
      { lastActivity: 1750000000, prCount: 10, reviewCount: 5, issueCount: 3, mergeCount: 8, hasMergedPrs: 1 },
    ],
  },
  {
    owner: "bendrucker",
    name: "old-project",
    description: "An old project",
    primaryLanguageName: "JavaScript",
    primaryLanguageColor: "#f1e05a",
    stargazerCount: 5,
    activity: [
      { lastActivity: 1686000000, prCount: 1, reviewCount: 0, issueCount: 2, mergeCount: 1, hasMergedPrs: 1 },
    ],
  },
  {
    owner: "bendrucker",
    name: "new-thing",
    description: "Something new",
    primaryLanguageName: "Go",
    primaryLanguageColor: "#00ADD8",
    stargazerCount: 50,
    activity: [
      { lastActivity: 1741000000, prCount: 3, reviewCount: 1, issueCount: 0, mergeCount: 2, hasMergedPrs: 1 },
    ],
  },
  {
    owner: "other-org",
    name: "shared-tool",
    description: "Shared tooling",
    primaryLanguageName: "TypeScript",
    primaryLanguageColor: "#3178c6",
    stargazerCount: 200,
    activity: [
      { lastActivity: 1748000000, prCount: 2, reviewCount: 4, issueCount: 1, mergeCount: 1, hasMergedPrs: 1 },
    ],
  },
  {
    owner: "another",
    name: "widget",
    description: "A widget",
    primaryLanguageName: "Python",
    primaryLanguageColor: "#3572A5",
    stargazerCount: 10,
    activity: [
      { lastActivity: 1725000000, prCount: 0, reviewCount: 0, issueCount: 3, mergeCount: 0, hasMergedPrs: 0 },
    ],
  },
  {
    owner: "contrib",
    name: "big-project",
    description: "A big project",
    stargazerCount: 500,
    activity: [
      { lastActivity: 1745000000, prCount: 7, reviewCount: 3, issueCount: 2, mergeCount: 5, hasMergedPrs: 1 },
    ],
  },
];

describe("queryRepos", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = createTestDb();
    await seed(db, FIXTURES, LANGUAGE_EXTENSIONS);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("returns all repos sorted by recent activity", async () => {
    const result = await queryRepos(db, {});
    expect(result.total).toBe(6);
    expect(result.repos).toHaveLength(6);
    expect(result.repos.map((r) => r.name)).toEqual([
      "cool-lib",
      "shared-tool",
      "big-project",
      "new-thing",
      "widget",
      "old-project",
    ]);
  });

  it("filters by personal owner", async () => {
    const result = await queryRepos(db, { owner: "personal" });
    expect(result.total).toBe(3);
    for (const repo of result.repos) {
      expect(repo.owner).toBe("bendrucker");
    }
  });

  it("filters by external owner", async () => {
    const result = await queryRepos(db, { owner: "external" });
    expect(result.total).toBe(3);
    for (const repo of result.repos) {
      expect(repo.owner).not.toBe("bendrucker");
    }
  });

  it("filters by language", async () => {
    const result = await queryRepos(db, { language: "TypeScript" });
    expect(result.total).toBe(2);
    for (const repo of result.repos) {
      expect(repo.primaryLanguage?.name).toBe("TypeScript");
    }
  });

  it("filters by search term", async () => {
    const result = await queryRepos(db, { search: "cool" });
    expect(result.total).toBe(1);
    expect(result.repos[0].name).toBe("cool-lib");
  });

  it("filters by year", async () => {
    const result = await queryRepos(db, { year: 2025 });
    expect(result.total).toBe(4);
    expect(result.repos.map((r) => r.name).sort()).toEqual([
      "big-project",
      "cool-lib",
      "new-thing",
      "shared-tool",
    ]);
  });

  it("sorts by stars descending", async () => {
    const result = await queryRepos(db, { sort: "stars" });
    const stars = result.repos.map((r) => r.stargazerCount);
    expect(stars).toEqual([...stars].sort((a, b) => b - a));
    expect(result.repos[0].name).toBe("big-project");
  });

  it("sorts by name ascending", async () => {
    const result = await queryRepos(db, { sort: "name" });
    const names = result.repos.map((r) => r.name);
    expect(names).toEqual([...names].sort());
  });

  it("sorts by total activity descending", async () => {
    const result = await queryRepos(db, { sort: "active" });
    const totals = result.repos.map(
      (r) =>
        r.activitySummary.prCount +
        r.activitySummary.reviewCount +
        r.activitySummary.issueCount +
        r.activitySummary.mergeCount,
    );
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
  });

  it("maps repo row fields correctly", async () => {
    const result = await queryRepos(db, { search: "cool" });
    const repo = result.repos[0];
    expect(repo.owner).toBe("bendrucker");
    expect(repo.name).toBe("cool-lib");
    expect(repo.description).toBe("A cool library");
    expect(repo.primaryLanguage).toEqual({
      name: "TypeScript",
      color: "#3178c6",
      extension: ".ts",
    });
    expect(repo.stargazerCount).toBe(100);
    expect(repo.activitySummary.prCount).toBe(15);
    expect(repo.activitySummary.reviewCount).toBe(7);
    expect(repo.activitySummary.hasMergedPRs).toBe(true);
    expect(repo.years).toEqual([2025, 2024]);
  });

  it("returns null primaryLanguage when repo has no language", async () => {
    const result = await queryRepos(db, { search: "big" });
    expect(result.repos[0].primaryLanguage).toBeNull();
  });
});

describe("queryRepos pagination", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = createTestDb();
    const repos: SeedRepo[] = Array.from({ length: 25 }, (_, i) => ({
      owner: "bendrucker",
      name: `repo-${String(i).padStart(2, "0")}`,
      activity: [{ lastActivity: 1750000000 - i * 86400 }],
    }));
    await seed(db, repos);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("returns first page with cursor", async () => {
    const page1 = await queryRepos(db, {});
    expect(page1.repos).toHaveLength(20);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeTruthy();
    expect(page1.total).toBe(25);
  });

  it("fetches remaining repos with cursor", async () => {
    const page1 = await queryRepos(db, {});
    const page2 = await queryRepos(db, { cursor: page1.nextCursor });
    expect(page2.repos).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();
  });

  it("paginates with offset-based cursor for stars sort", async () => {
    const page1 = await queryRepos(db, { sort: "stars" });
    expect(page1.hasMore).toBe(true);

    const page2 = await queryRepos(db, {
      sort: "stars",
      cursor: page1.nextCursor,
    });
    expect(page2.repos).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
  });

  it("throws InvalidCursorError for malformed recent cursor", async () => {
    const err = await queryRepos(db, { cursor: "garbage" }).catch((e) => e);
    expect(err).toBeInstanceOf(InvalidCursorError);
    expect(err.cursor).toBe("garbage");
  });

  it("throws InvalidCursorError for malformed offset cursor", async () => {
    const err = await queryRepos(db, {
      sort: "stars",
      cursor: "not-a-number",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(InvalidCursorError);
    expect(err.cursor).toBe("not-a-number");
  });
});

describe("queryLanguages", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = createTestDb();
    await seed(db, FIXTURES, LANGUAGE_EXTENSIONS);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("returns languages with repo counts", async () => {
    const result = await queryLanguages(db, {});
    const ts = result.languages.find((l) => l.name === "TypeScript");
    expect(ts).toBeDefined();
    expect(ts!.count).toBe(2);

    const go = result.languages.find((l) => l.name === "Go");
    expect(go).toBeDefined();
    expect(go!.count).toBe(1);
  });

  it("excludes repos with no language", async () => {
    const result = await queryLanguages(db, {});
    for (const lang of result.languages) {
      expect(lang.name).not.toBeNull();
    }
    expect(result.total).toBe(5);
  });

  it("includes extension from language_extensions", async () => {
    const result = await queryLanguages(db, {});
    const ts = result.languages.find((l) => l.name === "TypeScript");
    expect(ts).toBeDefined();
    expect(ts!.extension).toBe(".ts");
  });
});

describe("queryYears", () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = createTestDb();
    await seed(db, FIXTURES, LANGUAGE_EXTENSIONS);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("returns years with repo counts in descending order", async () => {
    const result = await queryYears(db, {});
    const years = result.years.map((y) => y.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
    expect(result.years.length).toBeGreaterThanOrEqual(3);
  });

  it("filters years by owner", async () => {
    const result = await queryYears(db, { owner: "external" });
    expect(result.years.length).toBeGreaterThan(0);
    const years = result.years.map((y) => y.year);
    expect(years).not.toContain(2023);
  });
});
