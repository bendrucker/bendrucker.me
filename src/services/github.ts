import { SITE } from '../config'

export interface GitHubContribution {
  repository: {
    name: string
    owner: {
      login: string
    }
    description: string | null
    url: string
    createdAt: string
  }
  occurredAt: string
}

export interface PullRequestContribution extends GitHubContribution {
  pullRequest: {
    number: number
    title: string
    url: string
  }
}

export interface PullRequestReviewContribution extends GitHubContribution {
  pullRequest: {
    number: number
    title: string
    url: string
  }
  pullRequestReview: {
    url: string
  }
}

export interface IssueContribution extends GitHubContribution {
  issue: {
    number: number
    title: string
    url: string
  }
}

export interface RepositoryContribution {
  repository: {
    name: string
    owner: {
      login: string
    }
    description: string | null
    url: string
    createdAt: string
  }
  occurredAt: string
}

export interface ContributionsCollection {
  pullRequestContributions: {
    nodes: PullRequestContribution[]
  }
  pullRequestReviewContributions: {
    nodes: PullRequestReviewContribution[]
  }
  issueContributions: {
    nodes: IssueContribution[]
  }
  repositoryContributions: {
    nodes: RepositoryContribution[]
  }
}

export interface ActivitySummary {
  prCount: number
  reviewCount: number
  issueCount: number
}

export interface RepoActivity {
  name: string
  owner: string
  description: string
  url: string
  lastActivity: Date
  activitySummary: ActivitySummary
  isNew?: boolean
  createdAt?: Date
}

const GITHUB_GRAPHQL_QUERY = `
  query GetUserContributions($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        pullRequestContributions(first: 100) {
          nodes {
            repository {
              name
              owner {
                login
              }
              description
              url
              createdAt
            }
            occurredAt
            pullRequest {
              number
              title
              url
            }
          }
        }
        pullRequestReviewContributions(first: 100) {
          nodes {
            repository {
              name
              owner {
                login
              }
              description
              url
              createdAt
            }
            occurredAt
            pullRequest {
              number
              title
              url
            }
            pullRequestReview {
              url
            }
          }
        }
        issueContributions(first: 100) {
          nodes {
            repository {
              name
              owner {
                login
              }
              description
              url
              createdAt
            }
            occurredAt
            issue {
              number
              title
              url
            }
          }
        }
        repositoryContributions(first: 100) {
          nodes {
            repository {
              name
              owner {
                login
              }
              description
              url
              createdAt
            }
            occurredAt
          }
        }
      }
    }
  }
`

export async function fetchGitHubActivity(token: string): Promise<RepoActivity[]> {
  if (!token) {
    throw new Error('GitHub token is required')
  }

  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000))

  const variables = {
    username: SITE.githubUsername,
    from: sixMonthsAgo.toISOString(),
    to: now.toISOString()
  }

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': `${SITE.title} Activity Fetcher`
      },
      body: JSON.stringify({
        query: GITHUB_GRAPHQL_QUERY,
        variables
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}`)
    }

    if (!data.data?.user?.contributionsCollection) {
      throw new Error('Invalid response structure from GitHub API')
    }

    const contributionsCollection: ContributionsCollection = data.data.user.contributionsCollection

    return aggregateActivityByRepository(contributionsCollection)
  } catch (error) {
    if (error instanceof Error) {
      console.error('GitHub API fetch failed:', error.message)
      throw error
    }
    throw new Error('Unknown error occurred while fetching GitHub activity')
  }
}

function aggregateActivityByRepository(contributions: ContributionsCollection): RepoActivity[] {
  const repoMap = new Map<string, RepoActivity>()
  const oneMonthAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))

  // Process all contribution types
  const allContributions = [
    ...contributions.pullRequestContributions.nodes,
    ...contributions.pullRequestReviewContributions.nodes,
    ...contributions.issueContributions.nodes,
    ...contributions.repositoryContributions.nodes
  ]

  // Initialize repositories
  allContributions.forEach(contribution => {
    const repoKey = `${contribution.repository.owner.login}/${contribution.repository.name}`
    
    if (!repoMap.has(repoKey)) {
      const createdAt = new Date(contribution.repository.createdAt)
      repoMap.set(repoKey, {
        name: contribution.repository.name,
        owner: contribution.repository.owner.login,
        description: contribution.repository.description || '',
        url: contribution.repository.url,
        lastActivity: new Date(contribution.occurredAt),
        activitySummary: {
          prCount: 0,
          reviewCount: 0,
          issueCount: 0
        },
        isNew: createdAt > oneMonthAgo,
        createdAt
      })
    } else {
      // Update last activity if this contribution is more recent
      const repo = repoMap.get(repoKey)!
      const contributionDate = new Date(contribution.occurredAt)
      if (contributionDate > repo.lastActivity) {
        repo.lastActivity = contributionDate
      }
    }
  })

  // Count contributions by type
  contributions.pullRequestContributions.nodes.forEach(contribution => {
    const repoKey = `${contribution.repository.owner.login}/${contribution.repository.name}`
    const repo = repoMap.get(repoKey)!
    repo.activitySummary.prCount++
  })

  contributions.pullRequestReviewContributions.nodes.forEach(contribution => {
    const repoKey = `${contribution.repository.owner.login}/${contribution.repository.name}`
    const repo = repoMap.get(repoKey)!
    repo.activitySummary.reviewCount++
  })

  contributions.issueContributions.nodes.forEach(contribution => {
    const repoKey = `${contribution.repository.owner.login}/${contribution.repository.name}`
    const repo = repoMap.get(repoKey)!
    repo.activitySummary.issueCount++
  })

  // Convert to array and sort by last activity (most recent first)
  return Array.from(repoMap.values())
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
}
