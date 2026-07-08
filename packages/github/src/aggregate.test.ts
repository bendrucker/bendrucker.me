import { describe, expect, it } from "vitest";
import type {
  CommitContributionsByRepository,
  ContributionsCollection,
  CreatedCommitContribution,
  CreatedCommitContributionConnection,
  CreatedPullRequestContribution,
  CreatedPullRequestContributionConnection,
  CreatedPullRequestReviewContribution,
  CreatedPullRequestReviewContributionConnection,
  CreatedRepositoryContribution,
  CreatedRepositoryContributionConnection,
  Issue,
  PullRequest,
  PullRequestContributionsByRepository,
  PullRequestReviewContributionsByRepository,
  Repository,
  SearchResultItemConnection,
} from "@octokit/graphql-schema";
import { aggregateActivityByRepository } from "./aggregate";

const USERNAME = "bendrucker";

interface RepoOptions {
  owner?: string;
  name?: string;
  isFork?: boolean;
  description?: string | null;
  primaryLanguage?: { name: string; color: string | null } | null;
  stargazerCount?: number;
}

function makeRepo(options: RepoOptions = {}): Repository {
  const owner = options.owner ?? USERNAME;
  const name = options.name ?? "repo";
  const repo: {
    name: string;
    owner: { login: string };
    description: string | null;
    url: string;
    createdAt: string;
    isFork: boolean;
    stargazerCount: number;
    primaryLanguage: { name: string; color: string | null } | null;
  } = {
    name,
    owner: { login: owner },
    description: options.description ?? null,
    url: `https://github.com/${owner}/${name}`,
    createdAt: "2020-01-01T00:00:00Z",
    isFork: options.isFork ?? false,
    stargazerCount: options.stargazerCount ?? 0,
    primaryLanguage: options.primaryLanguage ?? null,
  };
  return repo as Repository;
}

function makeCommitConnection(
  occurredAts: string[],
  totalCount = occurredAts.length,
): CreatedCommitContributionConnection {
  const nodes: CreatedCommitContributionConnection["nodes"] = occurredAts.map(
    (occurredAt) => {
      const node: { commitCount: number; occurredAt: string } = {
        commitCount: 1,
        occurredAt,
      };
      return node as CreatedCommitContribution;
    },
  );
  const connection: {
    totalCount: number;
    nodes: CreatedCommitContributionConnection["nodes"];
  } = { totalCount, nodes };
  return connection as CreatedCommitContributionConnection;
}

function makeCommitRepo(
  repository: Repository,
  occurredAts: string[],
  totalCount = occurredAts.length,
): CommitContributionsByRepository {
  const contrib: {
    repository: Repository;
    contributions: CreatedCommitContributionConnection;
  } = {
    repository,
    contributions: makeCommitConnection(occurredAts, totalCount),
  };
  return contrib as CommitContributionsByRepository;
}

interface PrContributionOptions {
  occurredAt: string;
  merged?: boolean;
  mergedAt?: string | null;
}

function makePrContribution(
  options: PrContributionOptions,
): CreatedPullRequestContribution {
  const pullRequest: { merged: boolean; mergedAt: string | null } = {
    merged: options.merged ?? false,
    mergedAt: options.mergedAt ?? null,
  };
  const node: { occurredAt: string; pullRequest: PullRequest } = {
    occurredAt: options.occurredAt,
    pullRequest: pullRequest as PullRequest,
  };
  return node as CreatedPullRequestContribution;
}

function makePrRepo(
  repository: Repository,
  nodes: CreatedPullRequestContribution[],
): PullRequestContributionsByRepository {
  const connection: {
    nodes: CreatedPullRequestContributionConnection["nodes"];
  } = { nodes };
  const contrib: {
    repository: Repository;
    contributions: CreatedPullRequestContributionConnection;
  } = {
    repository,
    contributions: connection as CreatedPullRequestContributionConnection,
  };
  return contrib as PullRequestContributionsByRepository;
}

interface ReviewContributionOptions {
  occurredAt: string;
  authorLogin: string;
  authorTypename?: string;
}

function makeReviewContribution(
  options: ReviewContributionOptions,
): CreatedPullRequestReviewContribution {
  const author: { login: string; __typename?: string } = {
    login: options.authorLogin,
    __typename: options.authorTypename ?? "User",
  };
  const pullRequest: {
    author: { login: string; __typename?: string } | null;
  } = { author };
  const node: { occurredAt: string; pullRequest: PullRequest } = {
    occurredAt: options.occurredAt,
    pullRequest: pullRequest as PullRequest,
  };
  return node as CreatedPullRequestReviewContribution;
}

function makeReviewRepo(
  repository: Repository,
  nodes: CreatedPullRequestReviewContribution[],
): PullRequestReviewContributionsByRepository {
  const connection: {
    nodes: CreatedPullRequestReviewContributionConnection["nodes"];
  } = { nodes };
  const contrib: {
    repository: Repository;
    contributions: CreatedPullRequestReviewContributionConnection;
  } = {
    repository,
    contributions: connection as CreatedPullRequestReviewContributionConnection,
  };
  return contrib as PullRequestReviewContributionsByRepository;
}

function makeRepositoryContributionConnection(
  entries: { repository: Repository; occurredAt: string }[],
): CreatedRepositoryContributionConnection {
  const nodes: CreatedRepositoryContributionConnection["nodes"] = entries.map(
    (entry) => entry as CreatedRepositoryContribution,
  );
  const connection: {
    nodes: CreatedRepositoryContributionConnection["nodes"];
  } = { nodes };
  return connection as CreatedRepositoryContributionConnection;
}

interface ContributionsParts {
  commit?: CommitContributionsByRepository[];
  pullRequest?: PullRequestContributionsByRepository[];
  review?: PullRequestReviewContributionsByRepository[];
  repositoryContributions?: { repository: Repository; occurredAt: string }[];
}

function makeContributions(
  parts: ContributionsParts = {},
): ContributionsCollection {
  const collection: {
    commitContributionsByRepository: CommitContributionsByRepository[];
    pullRequestContributionsByRepository: PullRequestContributionsByRepository[];
    pullRequestReviewContributionsByRepository: PullRequestReviewContributionsByRepository[];
    repositoryContributions: CreatedRepositoryContributionConnection;
  } = {
    commitContributionsByRepository: parts.commit ?? [],
    pullRequestContributionsByRepository: parts.pullRequest ?? [],
    pullRequestReviewContributionsByRepository: parts.review ?? [],
    repositoryContributions: makeRepositoryContributionConnection(
      parts.repositoryContributions ?? [],
    ),
  };
  return collection as ContributionsCollection;
}

interface IssueNodeOptions {
  repository: Repository;
  createdAt?: string;
  number?: number;
  title?: string;
  url?: string;
}

function makeIssueNode(options: IssueNodeOptions): Issue {
  const node: {
    __typename?: "Issue";
    number: number;
    title: string;
    url: string;
    createdAt: string;
    repository: Repository;
  } = {
    __typename: "Issue",
    number: options.number ?? 1,
    title: options.title ?? "An issue",
    url: options.url ?? "https://github.com/x/y/issues/1",
    createdAt: options.createdAt ?? "2024-01-01T00:00:00Z",
    repository: options.repository,
  };
  return node as Issue;
}

interface MergedPrNodeOptions {
  repository: Repository;
  createdAt?: string;
  merged?: boolean;
  mergedByLogin?: string | null;
  authorLogin?: string | null;
  number?: number;
  title?: string;
  url?: string;
}

function makeMergedPrNode(options: MergedPrNodeOptions): PullRequest {
  const node: {
    __typename?: "PullRequest";
    number: number;
    title: string;
    url: string;
    createdAt: string;
    merged: boolean;
    mergedBy: { login: string } | null;
    author: { login: string } | null;
    repository: Repository;
  } = {
    __typename: "PullRequest",
    number: options.number ?? 1,
    title: options.title ?? "A pull request",
    url: options.url ?? "https://github.com/x/y/pull/1",
    createdAt: options.createdAt ?? "2024-01-01T00:00:00Z",
    merged: options.merged ?? true,
    mergedBy:
      options.mergedByLogin === null
        ? null
        : { login: options.mergedByLogin ?? USERNAME },
    author:
      options.authorLogin === null
        ? null
        : { login: options.authorLogin ?? "someone-else" },
    repository: options.repository,
  };
  return node as PullRequest;
}

function makeSearch(
  nodes: SearchResultItemConnection["nodes"],
): SearchResultItemConnection {
  const connection: { nodes: SearchResultItemConnection["nodes"] } = { nodes };
  return connection as SearchResultItemConnection;
}

function names(repos: { name: string }[]): string[] {
  return repos.map((repo) => repo.name);
}

describe("aggregateActivityByRepository", () => {
  describe("fork filtering", () => {
    it("excludes fork repositories from every contribution source", () => {
      const fork = (name: string) => makeRepo({ name, isFork: true });

      const contributions = makeContributions({
        commit: [makeCommitRepo(fork("commit-fork"), ["2024-01-01T00:00:00Z"])],
        pullRequest: [
          makePrRepo(fork("pr-fork"), [
            makePrContribution({ occurredAt: "2024-01-01T00:00:00Z" }),
          ]),
        ],
        review: [
          makeReviewRepo(fork("review-fork"), [
            makeReviewContribution({
              occurredAt: "2024-01-01T00:00:00Z",
              authorLogin: "someone-else",
            }),
          ]),
        ],
        repositoryContributions: [
          {
            repository: fork("created-fork"),
            occurredAt: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const issueSearch = makeSearch([
        makeIssueNode({ repository: fork("issue-fork") }),
      ]);
      const mergedPRSearch = makeSearch([
        makeMergedPrNode({ repository: fork("merged-fork") }),
      ]);

      const result = aggregateActivityByRepository(
        contributions,
        issueSearch,
        mergedPRSearch,
        USERNAME,
      );

      expect(result).toEqual([]);
    });
  });

  describe("relevance filter", () => {
    it("keeps a repository with only commit contributions", () => {
      const contributions = makeContributions({
        commit: [
          makeCommitRepo(makeRepo({ name: "commits-only" }), [
            "2024-02-01T00:00:00Z",
          ]),
        ],
      });

      const result = aggregateActivityByRepository(contributions);

      expect(names(result)).toEqual(["commits-only"]);
      expect(result[0].activitySummary).toEqual({
        prCount: 0,
        reviewCount: 0,
        issueCount: 0,
        mergeCount: 0,
        hasMergedPRs: false,
      });
    });

    it("skips commit repositories whose totalCount is zero", () => {
      const contributions = makeContributions({
        commit: [makeCommitRepo(makeRepo({ name: "empty-commits" }), [], 0)],
      });

      const result = aggregateActivityByRepository(contributions);

      expect(result).toEqual([]);
    });

    it("excludes an issue-only repository", () => {
      const issueSearch = makeSearch([
        makeIssueNode({ repository: makeRepo({ name: "issue-only" }) }),
      ]);

      const result = aggregateActivityByRepository(
        makeContributions(),
        issueSearch,
        undefined,
        USERNAME,
      );

      expect(result).toEqual([]);
    });

    it("excludes a repository with unmerged PRs and no reviews or merges", () => {
      const contributions = makeContributions({
        pullRequest: [
          makePrRepo(makeRepo({ name: "unmerged" }), [
            makePrContribution({
              occurredAt: "2024-01-01T00:00:00Z",
              merged: false,
            }),
          ]),
        ],
      });

      const result = aggregateActivityByRepository(contributions);

      expect(result).toEqual([]);
    });

    it("keeps a repository with only reviews", () => {
      const contributions = makeContributions({
        review: [
          makeReviewRepo(makeRepo({ name: "reviews-only" }), [
            makeReviewContribution({
              occurredAt: "2024-01-01T00:00:00Z",
              authorLogin: "someone-else",
            }),
          ]),
        ],
      });

      const result = aggregateActivityByRepository(
        contributions,
        undefined,
        undefined,
        USERNAME,
      );

      expect(names(result)).toEqual(["reviews-only"]);
      expect(result[0].activitySummary.reviewCount).toBe(1);
    });

    it("keeps a repository with only attributed merges", () => {
      const mergedPRSearch = makeSearch([
        makeMergedPrNode({ repository: makeRepo({ name: "merges-only" }) }),
      ]);

      const result = aggregateActivityByRepository(
        makeContributions(),
        undefined,
        mergedPRSearch,
        USERNAME,
      );

      expect(names(result)).toEqual(["merges-only"]);
      expect(result[0].activitySummary.mergeCount).toBe(1);
      expect(result[0].activitySummary.hasMergedPRs).toBe(true);
    });

    it("keeps a repository with a merged PR contribution", () => {
      const contributions = makeContributions({
        pullRequest: [
          makePrRepo(makeRepo({ name: "merged-pr" }), [
            makePrContribution({
              occurredAt: "2024-01-01T00:00:00Z",
              merged: true,
              mergedAt: "2024-01-02T00:00:00Z",
            }),
          ]),
        ],
      });

      const result = aggregateActivityByRepository(contributions);

      expect(names(result)).toEqual(["merged-pr"]);
      expect(result[0].activitySummary.prCount).toBe(1);
      expect(result[0].activitySummary.hasMergedPRs).toBe(true);
    });
  });

  describe("review filtering", () => {
    it("excludes reviews of the user's own PRs and bot-authored PRs", () => {
      const contributions = makeContributions({
        review: [
          makeReviewRepo(makeRepo({ name: "mixed-reviews" }), [
            makeReviewContribution({
              occurredAt: "2024-01-03T00:00:00Z",
              authorLogin: USERNAME,
            }),
            makeReviewContribution({
              occurredAt: "2024-01-04T00:00:00Z",
              authorLogin: "dependabot",
              authorTypename: "Bot",
            }),
            makeReviewContribution({
              occurredAt: "2024-01-05T00:00:00Z",
              authorLogin: "someone-else",
            }),
          ]),
        ],
      });

      const result = aggregateActivityByRepository(
        contributions,
        undefined,
        undefined,
        USERNAME,
      );

      expect(names(result)).toEqual(["mixed-reviews"]);
      expect(result[0].activitySummary.reviewCount).toBe(1);
    });

    it("drops a repository whose only reviews are all filtered out", () => {
      const contributions = makeContributions({
        review: [
          makeReviewRepo(makeRepo({ name: "self-reviews" }), [
            makeReviewContribution({
              occurredAt: "2024-01-03T00:00:00Z",
              authorLogin: USERNAME,
            }),
          ]),
        ],
      });

      const result = aggregateActivityByRepository(
        contributions,
        undefined,
        undefined,
        USERNAME,
      );

      expect(result).toEqual([]);
    });
  });

  describe("merged-PR search attribution", () => {
    const attributed = (options: MergedPrNodeOptions) =>
      aggregateActivityByRepository(
        makeContributions(),
        undefined,
        makeSearch([makeMergedPrNode(options)]),
        USERNAME,
      );

    it("counts a node merged by the user on the user's own repository", () => {
      const result = attributed({
        repository: makeRepo({ owner: USERNAME, name: "attributed" }),
      });

      expect(names(result)).toEqual(["attributed"]);
      expect(result[0].activitySummary.mergeCount).toBe(1);
    });

    it("drops a node that is not merged", () => {
      expect(
        attributed({ repository: makeRepo({ name: "x" }), merged: false }),
      ).toEqual([]);
    });

    it("drops a node merged by someone other than the user", () => {
      expect(
        attributed({
          repository: makeRepo({ name: "x" }),
          mergedByLogin: "other",
        }),
      ).toEqual([]);
    });

    it("drops a node authored by the user", () => {
      expect(
        attributed({
          repository: makeRepo({ name: "x" }),
          authorLogin: USERNAME,
        }),
      ).toEqual([]);
    });

    it("drops a node on a forked repository", () => {
      expect(
        attributed({ repository: makeRepo({ name: "x", isFork: true }) }),
      ).toEqual([]);
    });

    it("drops a node whose repository owner is not the user", () => {
      expect(
        attributed({ repository: makeRepo({ owner: "other", name: "x" }) }),
      ).toEqual([]);
    });
  });

  describe("hasMergedPRs sourcing", () => {
    it("sets hasMergedPRs from a merged PR contribution", () => {
      const contributions = makeContributions({
        pullRequest: [
          makePrRepo(makeRepo({ name: "from-contribution" }), [
            makePrContribution({
              occurredAt: "2024-01-01T00:00:00Z",
              merged: true,
              mergedAt: "2024-01-02T00:00:00Z",
            }),
          ]),
        ],
      });

      const result = aggregateActivityByRepository(contributions);

      expect(result[0].activitySummary.hasMergedPRs).toBe(true);
    });

    it("sets hasMergedPRs from the merged-PR search", () => {
      const result = aggregateActivityByRepository(
        makeContributions(),
        undefined,
        makeSearch([
          makeMergedPrNode({ repository: makeRepo({ name: "from-search" }) }),
        ]),
        USERNAME,
      );

      expect(result[0].activitySummary.hasMergedPRs).toBe(true);
    });
  });

  describe("lastActivity", () => {
    it("uses the maximum date across a repository's contributions", () => {
      const contributions = makeContributions({
        commit: [
          makeCommitRepo(makeRepo({ name: "multi" }), [
            "2024-01-01T00:00:00Z",
            "2024-03-15T00:00:00Z",
            "2024-02-10T00:00:00Z",
          ]),
        ],
      });

      const result = aggregateActivityByRepository(contributions);

      expect(result[0].lastActivity).toEqual(new Date("2024-03-15T00:00:00Z"));
    });

    it("sorts repositories by lastActivity descending", () => {
      const contributions = makeContributions({
        commit: [
          makeCommitRepo(makeRepo({ name: "older" }), ["2023-06-01T00:00:00Z"]),
          makeCommitRepo(makeRepo({ name: "newer" }), ["2024-09-01T00:00:00Z"]),
          makeCommitRepo(makeRepo({ name: "middle" }), [
            "2024-01-01T00:00:00Z",
          ]),
        ],
      });

      const result = aggregateActivityByRepository(contributions);

      expect(names(result)).toEqual(["newer", "middle", "older"]);
    });
  });
});
