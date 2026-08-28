import type {
  ContributionsCollection,
  IssueNode,
  MergedPullRequestNode,
  Repository,
} from "./schema";
import type { RepoActivity } from "./index";

export function createRepoActivity(
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

// Issue counts come from the search below rather than from
// `issueContributionsByRepository`, which only feeds a truncation warning.
export type AggregatedContributions = Pick<
  ContributionsCollection,
  | "commitContributionsByRepository"
  | "pullRequestContributionsByRepository"
  | "pullRequestReviewContributionsByRepository"
  | "repositoryContributions"
>;

export function aggregateActivityByRepository(
  contributions: AggregatedContributions,
  issueNodes: IssueNode[] = [],
  mergedPRNodes: MergedPullRequestNode[] = [],
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
        const contributionDate = new Date(
          (contrib.pullRequest.merged && contrib.pullRequest.mergedAt) ||
            contrib.occurredAt,
        );
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

  issueNodes.forEach((node) => {
    const issueDate = new Date(node.createdAt);

    if (node.repository.isFork) return;

    const repo = getOrCreateRepo(repoMap, node.repository, issueDate);
    repo.activitySummary.issueCount++;

    if (issueDate > repo.lastActivity) {
      repo.lastActivity = issueDate;
    }
  });

  if (username) {
    mergedPRNodes.forEach((node) => {
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
    .toSorted((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}
