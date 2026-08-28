import { describe, expect, it } from "vitest";
import { contributionsResponse, issueSearchPage } from "./schema";

const repository = {
  name: "repo",
  owner: { login: "bendrucker" },
  description: null,
  url: "https://github.com/bendrucker/repo",
  createdAt: "2020-01-01T00:00:00Z",
  isFork: false,
  stargazerCount: 0,
  primaryLanguage: null,
};

function page(nodes: unknown[], pageInfo: unknown = { hasNextPage: false }) {
  return {
    search: {
      pageInfo,
      nodes,
    },
  };
}

const issue = {
  __typename: "Issue",
  createdAt: "2024-01-01T00:00:00Z",
  repository,
};

describe("issueSearchPage", () => {
  it("keeps issues", () => {
    expect(issueSearchPage.parse(page([issue])).search.nodes).toHaveLength(1);
  });

  it("drops a node of another type", () => {
    const nodes = [issue, { __typename: "PullRequest" }];

    expect(issueSearchPage.parse(page(nodes)).search.nodes).toEqual([issue]);
  });

  it("drops a null node", () => {
    expect(issueSearchPage.parse(page([null])).search.nodes).toEqual([]);
  });

  it("reads a missing node list as empty", () => {
    const empty = { search: { pageInfo: page([]).search.pageInfo } };

    expect(issueSearchPage.parse(empty).search.nodes).toEqual([]);
  });

  // The aggregation reads issues off `__typename`, so a query that stops
  // selecting it used to drop every result and report zero issues instead.
  it("rejects an issue with no __typename", () => {
    const nodes = [{ createdAt: issue.createdAt, repository }];

    expect(() => issueSearchPage.parse(page(nodes))).toThrow();
  });

  it("keeps the cursor a further page is reached by", () => {
    const info = { hasNextPage: true, endCursor: "Y3Vyc29yOjE=" };

    expect(issueSearchPage.parse(page([], info)).search.pageInfo).toEqual(info);
  });

  // A cursorless page that reports a successor sends the caller back to the
  // first page, which then repeats every node it holds until pagination stops.
  it("rejects a further page with no cursor", () => {
    const info = { hasNextPage: true, endCursor: null };

    expect(() => issueSearchPage.parse(page([], info))).toThrow();
  });

  it("rejects an issue whose repository lost a field", () => {
    const { name: _name, ...rest } = repository;
    const nodes = [{ ...issue, repository: rest }];

    expect(() => issueSearchPage.parse(page(nodes))).toThrow();
  });
});

const contributionsCollection = {
  commitContributionsByRepository: [
    {
      repository,
      contributions: {
        totalCount: 1,
        nodes: [{ occurredAt: issue.createdAt }],
      },
    },
  ],
  pullRequestContributionsByRepository: [],
  pullRequestReviewContributionsByRepository: [],
  issueContributionsByRepository: [],
  repositoryContributions: { nodes: [] },
};

describe("contributionsResponse", () => {
  it("reads the contribution lists a query selected", () => {
    const response = { user: { contributionsCollection }, rateLimit: null };

    expect(
      contributionsResponse.parse(response).user?.contributionsCollection
        .commitContributionsByRepository,
    ).toHaveLength(1);
  });

  // The API declares every per-repository list `[T!]!`. Treating one as
  // optional turned a query that stopped selecting it into a clean parse
  // reporting no activity at all, with nothing logged.
  it.each<keyof typeof contributionsCollection>([
    "commitContributionsByRepository",
    "pullRequestContributionsByRepository",
    "pullRequestReviewContributionsByRepository",
    "issueContributionsByRepository",
  ])("rejects a response with no %s", (field) => {
    const { [field]: _dropped, ...rest } = contributionsCollection;
    const response = {
      user: { contributionsCollection: rest },
      rateLimit: null,
    };

    expect(() => contributionsResponse.parse(response)).toThrow();
  });
});
