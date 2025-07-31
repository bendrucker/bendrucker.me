import { graphql } from '@octokit/graphql' 
import { logger } from '@workspace/logger'
import type { GetUserContributionsQuery, GetUserContributionsQueryVariables } from './gql/graphql'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Our business logic types
export interface ActivitySummary {
  prCount: number
  reviewCount: number
  issueCount: number
  mergeCount: number
  hasMergedPRs: boolean
}

export interface RepoActivity {
  name: string
  owner: string
  description: string
  url: string
  lastActivity: Date
  activitySummary: ActivitySummary
  createdAt?: Date
  primaryLanguage?: {
    name: string
    color: string
  } | null
  stargazerCount: number
}

export interface GitHubConfig {
  username: string
  title: string
}

// Load GraphQL query from file (used for both codegen and runtime)
const GET_USER_CONTRIBUTIONS_QUERY = readFileSync(
  resolve(__dirname, 'queries/getUserContributions.graphql'), 
  'utf-8'
)

// Helper function to create a repository activity entry
function createRepoActivity(repository: any, initialActivity: Date = new Date(0)): RepoActivity {
  return {
    name: repository.name,
    owner: repository.owner.login,
    description: repository.description || '',
    url: repository.url,
    primaryLanguage: repository.primaryLanguage ? {
      name: repository.primaryLanguage.name,
      color: repository.primaryLanguage.color || ''
    } : null,
    stargazerCount: repository.stargazerCount,
    lastActivity: initialActivity,
    activitySummary: {
      prCount: 0,
      reviewCount: 0,
      issueCount: 0,
      mergeCount: 0,
      hasMergedPRs: false
    },
    createdAt: new Date(repository.createdAt)
  }
}

// Helper function to get or create repository in map
function getOrCreateRepo(
  repoMap: Map<string, RepoActivity>, 
  repository: any, 
  initialActivity?: Date
): RepoActivity {
  const repoKey = `${repository.owner.login}/${repository.name}`
  
  if (!repoMap.has(repoKey)) {
    repoMap.set(repoKey, createRepoActivity(repository, initialActivity))
  }
  
  return repoMap.get(repoKey)!
}

export async function fetchGitHubActivity(config: GitHubConfig): Promise<RepoActivity[]> {
  // GraphQL client relies on GITHUB_TOKEN environment variable
  const graphqlWithAuth = graphql.defaults({
    headers: {
      'user-agent': `${config.title} Activity Fetcher`,
    },
  })

  const now = new Date()
  const start = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
  
  logger.debug('Starting GitHub GraphQL request via Octokit', {
    username: config.username,
    timeframe: {
      from: start.toISOString(),
      to: now.toISOString()
    }
  })

  const variables: GetUserContributionsQueryVariables = {
    username: config.username,
    from: start.toISOString(),
    to: now.toISOString(),
    issueSearchQuery: `is:issue involves:${config.username} updated:>${start.toISOString().split('T')[0]}`,
    mergedPRSearchQuery: `is:pr is:merged user:${config.username} -author:${config.username} -author:app/dependabot -author:app/renovate merged:>${start.toISOString().split('T')[0]}`
  }

  try {
    // Use @octokit/graphql with generated typed query document
    const data = await graphqlWithAuth(GET_USER_CONTRIBUTIONS_QUERY, variables) as GetUserContributionsQuery

    if (!data?.user?.contributionsCollection) {
      throw new Error('Invalid response structure from GitHub API')
    }

    const contributionsCollection = data.user.contributionsCollection
    const issueSearch = data.search
    const mergedPRSearch = data.mergedPRs

    const result = aggregateActivityByRepository(contributionsCollection, issueSearch, mergedPRSearch, config.username)
    
    logger.info('GitHub activity processing completed', {
      username: config.username,
      repositoryCount: result.length,
      totalActivity: result.reduce((acc, repo) => ({
        prs: acc.prs + repo.activitySummary.prCount,
        reviews: acc.reviews + repo.activitySummary.reviewCount,
        issues: acc.issues + repo.activitySummary.issueCount,
        merges: acc.merges + repo.activitySummary.mergeCount
      }), { prs: 0, reviews: 0, issues: 0, merges: 0 })
    })
    
    return result
  } catch (error) {
    if (error instanceof Error) {
      logger.error('GitHub GraphQL API request failed', {
        error: error.message,
        username: config.username
      })
      throw error
    }
    throw new Error('Unknown error occurred while fetching GitHub activity')
  }
}

function aggregateActivityByRepository(
  contributions: NonNullable<GetUserContributionsQuery['user']>['contributionsCollection'], 
  issueSearch?: GetUserContributionsQuery['search'], 
  mergedPRSearch?: GetUserContributionsQuery['mergedPRs'], 
  username?: string
): RepoActivity[] {
  const repoMap = new Map<string, RepoActivity>()

  // Process commit contributions (direct pushes)
  contributions.commitContributionsByRepository.forEach((repoContrib) => {
    // Skip forked repositories
    if (repoContrib.repository.isFork) return
    
    if (repoContrib.contributions.totalCount === 0) return
    
    // Get the most recent commit activity
    let lastCommitDate = new Date(0)
    repoContrib.contributions.nodes?.forEach((node) => {
      if (node) {
        const nodeDate = new Date(node.occurredAt)
        if (nodeDate > lastCommitDate) {
          lastCommitDate = nodeDate
        }
      }
    })
    
    const repo = getOrCreateRepo(repoMap, repoContrib.repository, lastCommitDate)
    
    // Update last activity if commits are more recent
    if (lastCommitDate > repo.lastActivity) {
      repo.lastActivity = lastCommitDate
    }
  })

  // Process PR contributions
  contributions.pullRequestContributionsByRepository.forEach((repoContrib) => {
    // Skip forked repositories
    if (repoContrib.repository.isFork) return

    if (!repoContrib.contributions.nodes?.length) return

    const repo = getOrCreateRepo(repoMap, repoContrib.repository)
    repo.activitySummary.prCount += repoContrib.contributions.nodes.filter((n) => n !== null).length

    // Check for merged PRs
    const hasMergedPRs = repoContrib.contributions.nodes.some((contrib) => contrib?.pullRequest.merged)
    if (hasMergedPRs) {
      repo.activitySummary.hasMergedPRs = true
    }

    // Update last activity
    repoContrib.contributions.nodes.forEach((contrib) => {
      if (contrib) {
        const contributionDate = new Date(contrib.occurredAt)
        if (contributionDate > repo.lastActivity) {
          repo.lastActivity = contributionDate
        }
      }
    })
  })

  // Process PR review contributions
  contributions.pullRequestReviewContributionsByRepository.forEach((repoContrib) => {
    // Skip forked repositories
    if (repoContrib.repository.isFork) return

    // Filter out self-reviews and bot PRs
    const validReviews = repoContrib.contributions.nodes?.filter((contrib) =>
      contrib &&
      contrib.pullRequest.author?.login !== username &&
      contrib.pullRequest.author?.__typename !== 'Bot'
    ) || []

    if (validReviews.length === 0) return

    const repo = getOrCreateRepo(repoMap, repoContrib.repository)
    repo.activitySummary.reviewCount += validReviews.length

    // Update last activity (only from valid reviews)
    validReviews.forEach((contrib) => {
      if (contrib) {
        const contributionDate = new Date(contrib.occurredAt)
        if (contributionDate > repo.lastActivity) {
          repo.lastActivity = contributionDate
        }
      }
    })
  })

  // Process repository contributions (new repositories)
  contributions.repositoryContributions.nodes?.forEach((contribution) => {
    if (!contribution) return
    
    // Skip forked repositories
    if (contribution.repository.isFork) return

    const contributionDate = new Date(contribution.occurredAt)
    getOrCreateRepo(repoMap, contribution.repository, contributionDate)
  })

  // Process issues from search (issues where user is involved)
  if (issueSearch?.nodes) {
    issueSearch.nodes.forEach(node => {
      if (!node || node.__typename !== 'Issue') return
      if (!node.repository || !node.number || !node.title || !node.url || !node.createdAt) return
      
      const issueDate = new Date(node.createdAt)

      // Skip forked repositories
      if (node.repository.isFork) return

      const repo = getOrCreateRepo(repoMap, node.repository, issueDate)
      repo.activitySummary.issueCount++

      // Update last activity if this issue is more recent
      if (issueDate > repo.lastActivity) {
        repo.lastActivity = issueDate
      }
    })
  }

  // Process PRs merged by the user (only for repos they own)
  if (mergedPRSearch?.nodes && username) {
    mergedPRSearch.nodes.forEach(node => {
      if (!node || node.__typename !== 'PullRequest') return
      if (!node.repository || !node.number || !node.title || !node.url || !node.createdAt) return
      
      // Skip if not actually merged or merged by someone else
      if (!node.merged || node.mergedBy?.login !== username) return
      
      // Skip if authored by the user (already counted in PR contributions)
      if (node.author?.login === username) return
      
      // Skip forked repositories
      if (node.repository.isFork) return
      
      // Only count merges for repos owned by the user
      if (node.repository.owner.login !== username) return
      
      const prDate = new Date(node.createdAt)
      const repo = getOrCreateRepo(repoMap, node.repository, prDate)
      repo.activitySummary.mergeCount++ // Count merged PRs separately
      repo.activitySummary.hasMergedPRs = true
      
      // Update last activity if this PR is more recent
      if (prDate > repo.lastActivity) {
        repo.lastActivity = prDate
      }
    })
  }

  // Convert to array and apply filters
  return Array.from(repoMap.values())
    .filter(repo => {
      // Always include repos where we have commit activity (direct pushes)
      // These are detected by having a repo entry but no PR/review/issue/merge counts
      const hasOnlyCommits = repo.activitySummary.prCount === 0 && 
                             repo.activitySummary.reviewCount === 0 && 
                             repo.activitySummary.mergeCount === 0 &&
                             repo.activitySummary.issueCount === 0
      if (hasOnlyCommits) {
        return true // Include repos with direct commits
      }
      
      // Filter out repositories with only issues (no PRs, reviews, or merges)
      if (repo.activitySummary.prCount === 0 && repo.activitySummary.reviewCount === 0 && repo.activitySummary.mergeCount === 0) {
        return false
      }

      // If repository has PRs but no merged PRs and no reviews or merges, exclude it
      if (repo.activitySummary.prCount > 0 && !repo.activitySummary.hasMergedPRs && repo.activitySummary.reviewCount === 0 && repo.activitySummary.mergeCount === 0) {
        return false
      }

      // Include repositories with merged PRs, reviews, or merges
      return repo.activitySummary.hasMergedPRs || repo.activitySummary.reviewCount > 0 || repo.activitySummary.mergeCount > 0
    })
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
}
