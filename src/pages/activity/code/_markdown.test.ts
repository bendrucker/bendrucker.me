import { describe, it, expect } from "vitest";
import type { Repo } from "@/components/activity/composables/useActivityApi";
import { formatReposMarkdown } from "./_markdown";

const repo: Repo = {
  name: "example",
  owner: "user",
  description: "An example repo",
  url: "https://github.com/user/example",
  primaryLanguage: { name: "TypeScript", color: "#3178c6", extension: ".ts" },
  stargazerCount: 42,
  createdAt: "2024-01-01T00:00:00Z",
  lastActivity: "2025-06-14T00:00:00Z",
  activitySummary: {
    prCount: 10,
    reviewCount: 5,
    issueCount: 3,
    mergeCount: 8,
    hasMergedPRs: true,
  },
  years: [2025, 2024],
};

describe("formatReposMarkdown", () => {
  it("renders title without year", () => {
    const md = formatReposMarkdown([repo], 1);
    expect(md).toContain("# Code Activity\n");
  });

  it("renders title with year", () => {
    const md = formatReposMarkdown([repo], 1, { year: 2025 });
    expect(md).toContain("# Code Activity: 2025");
  });

  it("includes repo count", () => {
    const md = formatReposMarkdown([repo], 42);
    expect(md).toContain("42 repositories.");
  });

  it("formats repo details", () => {
    const md = formatReposMarkdown([repo], 1);
    expect(md).toContain("## user/example");
    expect(md).toContain("An example repo");
    expect(md).toContain("- Language: TypeScript");
    expect(md).toContain("- Stars: 42");
    expect(md).toContain("- Last active: 2025-06-14");
    expect(md).toContain("PRs: 10");
    expect(md).toContain("Reviews: 5");
    expect(md).toContain("Issues: 3");
  });

  it("omits language when absent", () => {
    const noLang = { ...repo, primaryLanguage: null };
    const md = formatReposMarkdown([noLang], 1);
    expect(md).not.toContain("Language:");
  });

  it("omits stars when zero", () => {
    const noStars = { ...repo, stargazerCount: 0 };
    const md = formatReposMarkdown([noStars], 1);
    expect(md).not.toContain("Stars:");
  });

  it("omits activity line when all counts are zero", () => {
    const noActivity = {
      ...repo,
      activitySummary: {
        prCount: 0,
        reviewCount: 0,
        issueCount: 0,
        mergeCount: 0,
        hasMergedPRs: false,
      },
    };
    const md = formatReposMarkdown([noActivity], 1);
    expect(md).not.toContain("PRs:");
    expect(md).not.toContain("Reviews:");
    expect(md).not.toContain("Issues:");
  });

  it("omits description when empty", () => {
    const noDesc = { ...repo, description: "" };
    const md = formatReposMarkdown([noDesc], 1);
    const lines = md.split("\n");
    const headerIdx = lines.findIndex((l) => l.includes("## user/example"));
    expect(lines[headerIdx + 1]).toBe("");
    expect(lines[headerIdx + 2]).toMatch(/^- /);
  });

  it("renders empty repos list", () => {
    const md = formatReposMarkdown([], 0);
    expect(md).toContain("# Code Activity");
    expect(md).toContain("0 repositories.");
    expect(md).not.toContain("##");
  });
});
