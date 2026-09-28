import type { Issue, PullRequest, RepoActivity } from "@workspace/github";

export function makePullRequest(
  overrides: Partial<PullRequest> = {},
): PullRequest {
  return {
    id: "PR_1",
    repository: { owner: "bendrucker", name: "cool-lib" },
    number: 1,
    title: "Add a thing",
    state: "OPEN",
    isDraft: false,
    createdAt: new Date("2025-05-01T00:00:00.000Z"),
    mergedAt: null,
    additions: 40,
    deletions: 10,
    reactions: 0,
    ...overrides,
  };
}

export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "I_1",
    repository: { owner: "bendrucker", name: "cool-lib" },
    number: 2,
    title: "A thing is missing",
    state: "OPEN",
    stateReason: null,
    createdAt: new Date("2025-04-01T00:00:00.000Z"),
    closedAt: null,
    reactions: 0,
    ...overrides,
  };
}

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
    pullRequestIds: [],
    issueIds: [],
    ...overrides,
  };
}
