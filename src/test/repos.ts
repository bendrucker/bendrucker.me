import type { RepoActivity } from "@workspace/github";

export function makeRepo(overrides: Partial<RepoActivity> = {}): RepoActivity {
  return {
    owner: "bendrucker",
    name: "cool-lib",
    description: "A cool library",
    url: "https://github.com/bendrucker/cool-lib",
    lastActivity: new Date("2025-06-01T00:00:00.000Z"),
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
    stargazerCount: 100,
    activitySummary: {
      prCount: 5,
      reviewCount: 2,
      issueCount: 1,
      mergeCount: 3,
      hasMergedPRs: true,
    },
    ...overrides,
  };
}
