import { describe, expect, it } from "vitest";
import {
  aggregateActivityByRepository,
  type AggregatedContributions,
} from "./aggregate";
import type {
  ContributionsCollection,
  IssueNode,
  MergedPullRequestNode,
  Repository,
} from "./schema";

const USERNAME = "bendrucker";

type CommitRepo =
  ContributionsCollection["commitContributionsByRepository"][number];
type PrRepo =
  ContributionsCollection["pullRequestContributionsByRepository"][number];
type PrContribution = PrRepo["contributions"]["nodes"][number];
type ReviewRepo =
  ContributionsCollection["pullRequestReviewContributionsByRepository"][number];
type ReviewContribution = ReviewRepo["contributions"]["nodes"][number];

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
  return {
    name,
    owner: { login: owner },
    description: options.description ?? null,
    url: `https://github.com/${owner}/${name}`,
    createdAt: "2020-01-01T00:00:00Z",
    isFork: options.isFork ?? false,
    stargazerCount: options.stargazerCount ?? 0,
    primaryLanguage: options.primaryLanguage ?? null,
  };
}

function makeCommitRepo(
  repository: Repository,
  occurredAts: string[],
  totalCount = occurredAts.length,
): CommitRepo {
  return {
    repository,
    contributions: {
      totalCount,
      nodes: occurredAts.map((occurredAt) => ({ occurredAt })),
    },
  };
}

interface PrContributionOptions {
  occurredAt: string;
  merged?: boolean;
  mergedAt?: string | null;
}

function makePrContribution(options: PrContributionOptions): PrContribution {
  return {
    occurredAt: options.occurredAt,
    pullRequest: {
      merged: options.merged ?? false,
      mergedAt: options.mergedAt ?? null,
    },
  };
}

function makePrRepo(repository: Repository, nodes: PrContribution[]): PrRepo {
  return { repository, contributions: { nodes } };
}

interface ReviewContributionOptions {
  occurredAt: string;
  authorLogin: string;
  authorTypename?: string;
}

function makeReviewContribution(
  options: ReviewContributionOptions,
): ReviewContribution {
  return {
    occurredAt: options.occurredAt,
    pullRequest: {
      author: {
        login: options.authorLogin,
        __typename: options.authorTypename ?? "User",
      },
    },
  };
}

function makeReviewRepo(
  repository: Repository,
  nodes: ReviewContribution[],
): ReviewRepo {
  return { repository, contributions: { nodes } };
}

interface ContributionsParts {
  commit?: CommitRepo[];
  pullRequest?: PrRepo[];
  review?: ReviewRepo[];
  repositoryContributions?: { repository: Repository; occurredAt: string }[];
}

function makeContributions(
  parts: ContributionsParts = {},
): AggregatedContributions {
  return {
    commitContributionsByRepository: parts.commit ?? [],
    pullRequestContributionsByRepository: parts.pullRequest ?? [],
    pullRequestReviewContributionsByRepository: parts.review ?? [],
    repositoryContributions: { nodes: parts.repositoryContributions ?? [] },
  };
}

interface IssueNodeOptions {
  repository: Repository;
  createdAt?: string;
}

function makeIssueNode(options: IssueNodeOptions): IssueNode {
  return {
    __typename: "Issue",
    createdAt: options.createdAt ?? "2024-01-01T00:00:00Z",
    repository: options.repository,
  };
}

interface MergedPrNodeOptions {
  repository: Repository;
  createdAt?: string;
  merged?: boolean;
  mergedByLogin?: string | null;
  authorLogin?: string | null;
}

function makeMergedPrNode(options: MergedPrNodeOptions): MergedPullRequestNode {
  return {
    __typename: "PullRequest",
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

      const issueSearch = [makeIssueNode({ repository: fork("issue-fork") })];
      const mergedPRSearch = [
        makeMergedPrNode({ repository: fork("merged-fork") }),
      ];

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
      const issueSearch = [
        makeIssueNode({ repository: makeRepo({ name: "issue-only" }) }),
      ];

      const result = aggregateActivityByRepository(
        makeContributions(),
        issueSearch,
        [],
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
        [],
        [],
        USERNAME,
      );

      expect(names(result)).toEqual(["reviews-only"]);
      expect(result[0].activitySummary.reviewCount).toBe(1);
    });

    it("keeps a repository with only attributed merges", () => {
      const mergedPRSearch = [
        makeMergedPrNode({ repository: makeRepo({ name: "merges-only" }) }),
      ];

      const result = aggregateActivityByRepository(
        makeContributions(),
        [],
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
        [],
        [],
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
        [],
        [],
        USERNAME,
      );

      expect(result).toEqual([]);
    });
  });

  describe("merged-PR search attribution", () => {
    const attributed = (options: MergedPrNodeOptions) =>
      aggregateActivityByRepository(
        makeContributions(),
        [],
        [makeMergedPrNode(options)],
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
        [],
        [makeMergedPrNode({ repository: makeRepo({ name: "from-search" }) })],
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
