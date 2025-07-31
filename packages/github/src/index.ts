import { graphql } from '@octokit/graphql'
import { createTokenAuth } from '@octokit/auth-token'
import type { 
  Repository,
  ContributionsCollection,
  User,
  SearchResultItemConnection
} from '@octokit/graphql-schema'
import { logger } from '@workspace/logger'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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

const __dirname = dirname(fileURLToPath(import.meta.url))

const GET_USER_CONTRIBUTIONS_QUERY = readFileSync(
  resolve(__dirname, 'queries/getUserContributions.graphql'),
  'utf-8'
)

interface GraphQLResponse {
  user: Pick<User, 'contributionsCollection'> | null
  search: SearchResultItemConnection | null
  mergedPRs: SearchResultItemConnection | null
}

function createRepoActivity(repository: Repository, initialActivity: Date = new Date(0)): RepoActivity {
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

function getOrCreateRepo(
  repoMap: Map<string, RepoActivity>,
  repository: Repository,
  initialActivity?: Date
): RepoActivity {
  const repoKey = `${repository.owner.login}/${repository.name}`

  if (!repoMap.has(repoKey)) {
    repoMap.set(repoKey, createRepoActivity(repository, initialActivity))
  }

  return repoMap.get(repoKey)!
}

export async function fetchGitHubActivity(token: string, config: GitHubConfig): Promise<RepoActivity[]> {
  const auth = createTokenAuth(token)
  
  const graphqlWithAuth = graphql.defaults({
    request: {
      hook: auth.hook,
    },
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

  const variables = {
    username: config.username,
    from: start.toISOString(),
    to: now.toISOString(),
    issueSearchQuery: `is:issue involves:${config.username} updated:>${start.toISOString().split('T')[0]}`,
    mergedPRSearchQuery: `is:pr is:merged user:${config.username} -author:${config.username} -author:app/dependabot -author:app/renovate merged:>${start.toISOString().split('T')[0]}`
  }

  try {
    const data = await graphqlWithAuth(GET_USER_CONTRIBUTIONS_QUERY, variables) as GraphQLResponse

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
  contributions: ContributionsCollection,
  issueSearch?: GraphQLResponse['search'],
  mergedPRSearch?: GraphQLResponse['mergedPRs'],
  username?: string
): RepoActivity[] {
  const repoMap = new Map<string, RepoActivity>()

  contributions.commitContributionsByRepository.forEach((repoContrib) => {
    if (repoContrib.repository.isFork) return

    if (repoContrib.contributions.totalCount === 0) return

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

    if (lastCommitDate > repo.lastActivity) {
      repo.lastActivity = lastCommitDate
    }
  })

  contributions.pullRequestContributionsByRepository.forEach((repoContrib) => {
    if (repoContrib.repository.isFork) return

    if (!repoContrib.contributions.nodes?.length) return

    const repo = getOrCreateRepo(repoMap, repoContrib.repository)
    repo.activitySummary.prCount += repoContrib.contributions.nodes.filter((n) => n !== null).length

    const hasMergedPRs = repoContrib.contributions.nodes.some((contrib) => contrib?.pullRequest.merged)
    if (hasMergedPRs) {
      repo.activitySummary.hasMergedPRs = true
    }

    repoContrib.contributions.nodes.forEach((contrib) => {
      if (contrib) {
        const contributionDate = new Date(contrib.occurredAt)
        if (contributionDate > repo.lastActivity) {
          repo.lastActivity = contributionDate
        }
      }
    })
  })

  contributions.pullRequestReviewContributionsByRepository.forEach((repoContrib) => {
    if (repoContrib.repository.isFork) return

    const validReviews = repoContrib.contributions.nodes?.filter((contrib) =>
      contrib &&
      contrib.pullRequest.author?.login !== username &&
      contrib.pullRequest.author?.__typename !== 'Bot'
    ) || []

    if (validReviews.length === 0) return

    const repo = getOrCreateRepo(repoMap, repoContrib.repository)
    repo.activitySummary.reviewCount += validReviews.length

    validReviews.forEach((contrib) => {
      if (contrib) {
        const contributionDate = new Date(contrib.occurredAt)
        if (contributionDate > repo.lastActivity) {
          repo.lastActivity = contributionDate
        }
      }
    })
  })

  contributions.repositoryContributions.nodes?.forEach((contribution) => {
    if (!contribution) return

    if (contribution.repository.isFork) return

    const contributionDate = new Date(contribution.occurredAt)
    getOrCreateRepo(repoMap, contribution.repository, contributionDate)
  })

  if (issueSearch?.nodes) {
    issueSearch.nodes.forEach(node => {
      if (!node || node.__typename !== 'Issue') return
      if (!node.repository || !node.number || !node.title || !node.url || !node.createdAt) return

      const issueDate = new Date(node.createdAt)

        if (node.repository.isFork) return

      const repo = getOrCreateRepo(repoMap, node.repository, issueDate)
      repo.activitySummary.issueCount++

      if (issueDate > repo.lastActivity) {
        repo.lastActivity = issueDate
      }
    })
  }

  if (mergedPRSearch?.nodes && username) {
    mergedPRSearch.nodes.forEach(node => {
      if (!node || node.__typename !== 'PullRequest') return
      if (!node.repository || !node.number || !node.title || !node.url || !node.createdAt) return

      if (!node.merged || node.mergedBy?.login !== username) return

      if (node.author?.login === username) return

        if (node.repository.isFork) return

      if (node.repository.owner.login !== username) return

      const prDate = new Date(node.createdAt)
      const repo = getOrCreateRepo(repoMap, node.repository, prDate)
      repo.activitySummary.mergeCount++
      repo.activitySummary.hasMergedPRs = true

      if (prDate > repo.lastActivity) {
        repo.lastActivity = prDate
      }
    })
  }

  return Array.from(repoMap.values())
    .filter(repo => {
      const hasOnlyCommits = repo.activitySummary.prCount === 0 &&
                             repo.activitySummary.reviewCount === 0 &&
                             repo.activitySummary.mergeCount === 0 &&
                             repo.activitySummary.issueCount === 0
      if (hasOnlyCommits) {
        return true
      }

      if (repo.activitySummary.prCount === 0 && repo.activitySummary.reviewCount === 0 && repo.activitySummary.mergeCount === 0) {
        return false
      }

      if (repo.activitySummary.prCount > 0 && !repo.activitySummary.hasMergedPRs && repo.activitySummary.reviewCount === 0 && repo.activitySummary.mergeCount === 0) {
        return false
      }

      return repo.activitySummary.hasMergedPRs || repo.activitySummary.reviewCount > 0 || repo.activitySummary.mergeCount > 0
    })
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
}
