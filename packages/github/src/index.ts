import { graphql } from "@octokit/graphql";
import { createTokenAuth } from "@octokit/auth-token";
import type {
  Repository,
  ContributionsCollection,
  User,
  SearchResultItemConnection,
} from "@octokit/graphql-schema";
import { logger } from "@workspace/logger";

export const GITHUB_EPOCH_YEAR = 2008;

// Our business logic types
export interface ActivitySummary {
  prCount: number;
  reviewCount: number;
  issueCount: number;
  mergeCount: number;
  hasMergedPRs: boolean;
}

export interface RepoActivity {
  name: string;
  owner: string;
  description: string;
  url: string;
  lastActivity: Date;
  activitySummary: ActivitySummary;
  createdAt?: Date;
  primaryLanguage?: {
    name: string;
    color: string;
  } | null;
  stargazerCount: number;
}

export interface GitHubConfig {
  username: string;
  title: string;
  from?: Date;
  to?: Date;
}

export interface RateLimit {
  remaining: number;
  cost: number;
  resetAt: string;
}

export interface GitHubActivityResult {
  repos: RepoActivity[];
  rateLimit: RateLimit;
}

// Simple gql tag for syntax highlighting
const gql = (strings: TemplateStringsArray) => strings.raw[0];

const GET_USER_CONTRIBUTIONS_QUERY = gql`
  fragment RepositoryInfo on Repository {
    name
    owner {
      login
    }
    description
    url
    createdAt
    isFork
    stargazerCount
    primaryLanguage {
      name
      color
    }
  }

  query GetUserContributions(
    $username: String!
    $from: DateTime!
    $to: DateTime!
  ) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
            ...RepositoryInfo
          }
          contributions(first: 100) {
            totalCount
            nodes {
              commitCount
              occurredAt
            }
          }
        }
        pullRequestContributionsByRepository(maxRepositories: 100) {
          repository {
            ...RepositoryInfo
          }
          contributions(first: 100) {
            nodes {
              occurredAt
              pullRequest {
                number
                title
                url
                state
                merged
              }
            }
          }
        }
        pullRequestReviewContributionsByRepository(maxRepositories: 100) {
          repository {
            ...RepositoryInfo
          }
          contributions(first: 100) {
            nodes {
              occurredAt
              pullRequest {
                number
                title
                url
                author {
                  login
                  __typename
                }
              }
              pullRequestReview {
                url
              }
            }
          }
        }
        issueContributionsByRepository(maxRepositories: 100) {
          repository {
            ...RepositoryInfo
          }
          contributions(first: 100) {
            nodes {
              occurredAt
              issue {
                number
                title
                url
              }
            }
          }
        }
        repositoryContributions(first: 100) {
          nodes {
            repository {
              ...RepositoryInfo
            }
            occurredAt
          }
        }
      }
    }

    rateLimit {
      remaining
      cost
      resetAt
    }
  }
`;

const ISSUE_SEARCH_QUERY = gql`
  fragment RepositoryInfo on Repository {
    name
    owner {
      login
    }
    description
    url
    createdAt
    isFork
    stargazerCount
    primaryLanguage {
      name
      color
    }
  }

  query IssueSearch($searchQuery: String!, $first: Int!, $after: String) {
    search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on Issue {
          number
          title
          url
          createdAt
          repository {
            ...RepositoryInfo
          }
        }
      }
    }
  }
`;

const MERGED_PR_SEARCH_QUERY = gql`
  fragment RepositoryInfo on Repository {
    name
    owner {
      login
    }
    description
    url
    createdAt
    isFork
    stargazerCount
    primaryLanguage {
      name
      color
    }
  }

  query MergedPRSearch($searchQuery: String!, $first: Int!, $after: String) {
    search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          number
          title
          url
          createdAt
          merged
          mergedBy {
            login
          }
          author {
            login
          }
          repository {
            ...RepositoryInfo
          }
        }
      }
    }
  }
`;

const SEARCH_PAGE_SIZE = 100;
const SEARCH_MAX_RESULTS = 1000;

interface SearchPage {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: SearchResultItemConnection["nodes"];
  };
}

async function paginateSearch(
  graphqlWithAuth: typeof graphql,
  query: string,
  searchQuery: string,
): Promise<SearchResultItemConnection["nodes"]> {
  const allNodes: NonNullable<SearchResultItemConnection["nodes"]> = [];
  let after: string | null = null;

  while (allNodes.length < SEARCH_MAX_RESULTS) {
    const data = (await graphqlWithAuth(query, {
      searchQuery,
      first: SEARCH_PAGE_SIZE,
      after,
    })) as SearchPage;

    const nodes = data.search.nodes ?? [];
    allNodes.push(...nodes);

    if (!data.search.pageInfo.hasNextPage) break;
    after = data.search.pageInfo.endCursor;
  }

  return allNodes;
}

interface ContributionsResponse {
  user: Pick<User, "contributionsCollection"> | null;
  rateLimit: { remaining: number; cost: number; resetAt: string } | null;
}

interface GraphQLResponse {
  user: Pick<User, "contributionsCollection"> | null;
  search: SearchResultItemConnection | null;
  mergedPRs: SearchResultItemConnection | null;
  rateLimit: { remaining: number; cost: number; resetAt: string } | null;
}

function createRepoActivity(
  repository: Repository,
  initialActivity: Date = new Date(0),
): RepoActivity {
  return {
    name: repository.name,
    owner: repository.owner.login,
    description: repository.description || "",
    url: repository.url,
    primaryLanguage: repository.primaryLanguage
      ? {
          name: repository.primaryLanguage.name,
          color: repository.primaryLanguage.color || "",
        }
      : null,
    stargazerCount: repository.stargazerCount,
    lastActivity: initialActivity,
    activitySummary: {
      prCount: 0,
      reviewCount: 0,
      issueCount: 0,
      mergeCount: 0,
      hasMergedPRs: false,
    },
    createdAt: new Date(repository.createdAt),
  };
}

function getOrCreateRepo(
  repoMap: Map<string, RepoActivity>,
  repository: Repository,
  initialActivity?: Date,
): RepoActivity {
  const repoKey = `${repository.owner.login}/${repository.name}`;

  if (!repoMap.has(repoKey)) {
    repoMap.set(repoKey, createRepoActivity(repository, initialActivity));
  }

  return repoMap.get(repoKey)!;
}

export async function fetchGitHubActivity(
  token: string,
  config: GitHubConfig,
): Promise<GitHubActivityResult> {
  const auth = createTokenAuth(token);

  const graphqlWithAuth = graphql.defaults({
    request: {
      hook: auth.hook,
    },
    headers: {
      "user-agent": `${config.title} Activity Fetcher`,
    },
  });

  const now = new Date();
  const to = config.to ?? now;
  const from =
    config.from ?? new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  logger.debug(
    {
      username: config.username,
      timeframe: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    },
    "Starting GitHub GraphQL request via Octokit",
  );

  const issueSearchQuery = `is:issue involves:${config.username} updated:>${from.toISOString().split("T")[0]}`;
  const mergedPRSearchQuery = `is:pr is:merged user:${config.username} -author:${config.username} -author:app/dependabot -author:app/renovate merged:>${from.toISOString().split("T")[0]}`;

  try {
    const data = (await graphqlWithAuth(GET_USER_CONTRIBUTIONS_QUERY, {
      username: config.username,
      from: from.toISOString(),
      to: to.toISOString(),
    })) as ContributionsResponse;

    if (!data?.user?.contributionsCollection) {
      throw new Error("Invalid response structure from GitHub API");
    }

    const contributionsCollection = data.user.contributionsCollection;

    const [issueNodes, mergedPRNodes] = await Promise.all([
      paginateSearch(graphqlWithAuth, ISSUE_SEARCH_QUERY, issueSearchQuery),
      paginateSearch(
        graphqlWithAuth,
        MERGED_PR_SEARCH_QUERY,
        mergedPRSearchQuery,
      ),
    ]);

    const issueSearch = { nodes: issueNodes } as SearchResultItemConnection;
    const mergedPRSearch = {
      nodes: mergedPRNodes,
    } as SearchResultItemConnection;

    const result = aggregateActivityByRepository(
      contributionsCollection,
      issueSearch,
      mergedPRSearch,
      config.username,
    );

    const cc = contributionsCollection;
    const truncationChecks = [
      {
        name: "commitContributionsByRepository",
        count: cc.commitContributionsByRepository.length,
      },
      {
        name: "pullRequestContributionsByRepository",
        count: cc.pullRequestContributionsByRepository.length,
      },
      {
        name: "pullRequestReviewContributionsByRepository",
        count: cc.pullRequestReviewContributionsByRepository.length,
      },
      {
        name: "issueContributionsByRepository",
        count: cc.issueContributionsByRepository?.length ?? 0,
      },
      {
        name: "repositoryContributions",
        count: cc.repositoryContributions.nodes?.length ?? 0,
      },
    ];

    for (const check of truncationChecks) {
      if (check.count >= 100) {
        logger.warn(
          {
            field: check.name,
            count: check.count,
            from: from.toISOString(),
            to: to.toISOString(),
          },
          "GitHub API result may be truncated (hit 100 item limit)",
        );
      }
    }

    const rateLimit: RateLimit = data.rateLimit ?? {
      remaining: 0,
      cost: 0,
      resetAt: new Date().toISOString(),
    };

    logger.info(
      {
        username: config.username,
        repositoryCount: result.length,
        rateLimit: { remaining: rateLimit.remaining, cost: rateLimit.cost },
        totalActivity: result.reduce(
          (acc, repo) => ({
            prs: acc.prs + repo.activitySummary.prCount,
            reviews: acc.reviews + repo.activitySummary.reviewCount,
            issues: acc.issues + repo.activitySummary.issueCount,
            merges: acc.merges + repo.activitySummary.mergeCount,
          }),
          { prs: 0, reviews: 0, issues: 0, merges: 0 },
        ),
      },
      "GitHub activity processing completed",
    );

    return { repos: result, rateLimit };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(
        {
          error: error.message,
          username: config.username,
        },
        "GitHub GraphQL API request failed",
      );
      throw error;
    }
    throw new Error("Unknown error occurred while fetching GitHub activity");
  }
}

function aggregateActivityByRepository(
  contributions: ContributionsCollection,
  issueSearch?: GraphQLResponse["search"],
  mergedPRSearch?: GraphQLResponse["mergedPRs"],
  username?: string,
): RepoActivity[] {
  const repoMap = new Map<string, RepoActivity>();

  contributions.commitContributionsByRepository.forEach((repoContrib) => {
    if (repoContrib.repository.isFork) return;

    if (repoContrib.contributions.totalCount === 0) return;

    let lastCommitDate = new Date(0);
    repoContrib.contributions.nodes?.forEach((node) => {
      if (node) {
        const nodeDate = new Date(node.occurredAt);
        if (nodeDate > lastCommitDate) {
          lastCommitDate = nodeDate;
        }
      }
    });

    const repo = getOrCreateRepo(
      repoMap,
      repoContrib.repository,
      lastCommitDate,
    );

    if (lastCommitDate > repo.lastActivity) {
      repo.lastActivity = lastCommitDate;
    }
  });

  contributions.pullRequestContributionsByRepository.forEach((repoContrib) => {
    if (repoContrib.repository.isFork) return;

    if (!repoContrib.contributions.nodes?.length) return;

    const repo = getOrCreateRepo(repoMap, repoContrib.repository);
    repo.activitySummary.prCount += repoContrib.contributions.nodes.filter(
      (n) => n !== null,
    ).length;

    const hasMergedPRs = repoContrib.contributions.nodes.some(
      (contrib) => contrib?.pullRequest.merged,
    );
    if (hasMergedPRs) {
      repo.activitySummary.hasMergedPRs = true;
    }

    repoContrib.contributions.nodes.forEach((contrib) => {
      if (contrib) {
        const contributionDate = new Date(contrib.occurredAt);
        if (contributionDate > repo.lastActivity) {
          repo.lastActivity = contributionDate;
        }
      }
    });
  });

  contributions.pullRequestReviewContributionsByRepository.forEach(
    (repoContrib) => {
      if (repoContrib.repository.isFork) return;

      const validReviews =
        repoContrib.contributions.nodes?.filter(
          (contrib) =>
            contrib &&
            contrib.pullRequest.author?.login !== username &&
            contrib.pullRequest.author?.__typename !== "Bot",
        ) || [];

      if (validReviews.length === 0) return;

      const repo = getOrCreateRepo(repoMap, repoContrib.repository);
      repo.activitySummary.reviewCount += validReviews.length;

      validReviews.forEach((contrib) => {
        if (contrib) {
          const contributionDate = new Date(contrib.occurredAt);
          if (contributionDate > repo.lastActivity) {
            repo.lastActivity = contributionDate;
          }
        }
      });
    },
  );

  contributions.repositoryContributions.nodes?.forEach((contribution) => {
    if (!contribution) return;

    if (contribution.repository.isFork) return;

    const contributionDate = new Date(contribution.occurredAt);
    getOrCreateRepo(repoMap, contribution.repository, contributionDate);
  });

  if (issueSearch?.nodes) {
    issueSearch.nodes.forEach((node) => {
      if (!node || node.__typename !== "Issue") return;
      if (
        !node.repository ||
        !node.number ||
        !node.title ||
        !node.url ||
        !node.createdAt
      )
        return;

      const issueDate = new Date(node.createdAt);

      if (node.repository.isFork) return;

      const repo = getOrCreateRepo(repoMap, node.repository, issueDate);
      repo.activitySummary.issueCount++;

      if (issueDate > repo.lastActivity) {
        repo.lastActivity = issueDate;
      }
    });
  }

  if (mergedPRSearch?.nodes && username) {
    mergedPRSearch.nodes.forEach((node) => {
      if (!node || node.__typename !== "PullRequest") return;
      if (
        !node.repository ||
        !node.number ||
        !node.title ||
        !node.url ||
        !node.createdAt
      )
        return;

      if (!node.merged || node.mergedBy?.login !== username) return;

      if (node.author?.login === username) return;

      if (node.repository.isFork) return;

      if (node.repository.owner.login !== username) return;

      const prDate = new Date(node.createdAt);
      const repo = getOrCreateRepo(repoMap, node.repository, prDate);
      repo.activitySummary.mergeCount++;
      repo.activitySummary.hasMergedPRs = true;

      if (prDate > repo.lastActivity) {
        repo.lastActivity = prDate;
      }
    });
  }

  return Array.from(repoMap.values())
    .filter((repo) => {
      const hasOnlyCommits =
        repo.activitySummary.prCount === 0 &&
        repo.activitySummary.reviewCount === 0 &&
        repo.activitySummary.mergeCount === 0 &&
        repo.activitySummary.issueCount === 0;
      if (hasOnlyCommits) {
        return true;
      }

      if (
        repo.activitySummary.prCount === 0 &&
        repo.activitySummary.reviewCount === 0 &&
        repo.activitySummary.mergeCount === 0
      ) {
        return false;
      }

      if (
        repo.activitySummary.prCount > 0 &&
        !repo.activitySummary.hasMergedPRs &&
        repo.activitySummary.reviewCount === 0 &&
        repo.activitySummary.mergeCount === 0
      ) {
        return false;
      }

      return (
        repo.activitySummary.hasMergedPRs ||
        repo.activitySummary.reviewCount > 0 ||
        repo.activitySummary.mergeCount > 0
      );
    })
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}
