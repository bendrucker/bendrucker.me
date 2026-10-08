// Read-model rows for the Code page tests, shaped as `queryCodeRows` returns them.
import type { CodeRepo, IssueRow, PullRow } from "@/code/types";

export function codeRepo(
  repo: string,
  overrides: Partial<Omit<CodeRepo, "repo" | "owner" | "name">> = {},
): CodeRepo {
  const [owner = "", name = ""] = repo.split("/");
  return {
    repo,
    owner,
    name,
    description: `${name} does a thing`,
    url: `https://github.com/${repo}`,
    language: { name: "TypeScript", color: "#3178c6", extension: "ts" },
    stars: 10,
    lastActivity: "2026-09-01T18:00:00.000Z",
    mine: owner === "bendrucker",
    pulls: [],
    issues: [],
    ...overrides,
  };
}

export function pull(
  id: string,
  createdAt: string,
  overrides: Partial<PullRow> = {},
): PullRow {
  return {
    id,
    repo: "bendrucker/cool-lib",
    number: 1,
    title: `Pull ${id}`,
    url: `https://github.com/bendrucker/cool-lib/pull/${id}`,
    state: "MERGED",
    isDraft: false,
    createdAt,
    mergedAt: createdAt,
    additions: 20,
    deletions: 5,
    reactions: 0,
    ...overrides,
  };
}

export function issue(
  id: string,
  createdAt: string,
  overrides: Partial<IssueRow> = {},
): IssueRow {
  return {
    id,
    repo: "bendrucker/cool-lib",
    number: 2,
    title: `Issue ${id}`,
    url: `https://github.com/bendrucker/cool-lib/issues/${id}`,
    state: "OPEN",
    stateReason: null,
    createdAt,
    closedAt: null,
    reactions: 0,
    ...overrides,
  };
}
