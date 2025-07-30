export interface GitHubContribution {
  repository: {
    name: string
    owner: {
      login: string
    }
    description: string | null
    url: string
    createdAt: string
    primaryLanguage: {
      name: string
      color: string
    } | null
  }
  occurredAt: string
}

export interface PullRequestContribution extends GitHubContribution {
  pullRequest: {
    number: number
    title: string
    url: string
    state: 'OPEN' | 'CLOSED' | 'MERGED'
    merged: boolean
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
    isFork: boolean
    stargazerCount: number
    primaryLanguage: {
      name: string
      color: string
    } | null
  }
  occurredAt: string
}

export interface ContributionsCollection {
  commitContributionsByRepository: Array<{
    repository: {
      name: string
      owner: { login: string }
      description: string | null
      url: string
      createdAt: string
      isFork: boolean
      stargazerCount: number
      primaryLanguage: {
        name: string
        color: string
      } | null
    }
    contributions: {
      totalCount: number
      nodes: Array<{
        commitCount: number
        occurredAt: string
      }>
    }
  }>
  pullRequestContributionsByRepository: Array<{
    repository: {
      name: string
      owner: { login: string }
      description: string | null
      url: string
      createdAt: string
      isFork: boolean
      stargazerCount: number
      primaryLanguage: {
        name: string
        color: string
      } | null
    }
    contributions: {
      nodes: Array<{
        occurredAt: string
        pullRequest: {
          number: number
          title: string
          url: string
          state: 'OPEN' | 'CLOSED' | 'MERGED'
          merged: boolean
        }
      }>
    }
  }>
  pullRequestReviewContributionsByRepository: Array<{
    repository: {
      name: string
      owner: { login: string }
      description: string | null
      url: string
      createdAt: string
      isFork: boolean
      stargazerCount: number
      primaryLanguage: {
        name: string
        color: string
      } | null
    }
    contributions: {
      nodes: Array<{
        occurredAt: string
        pullRequest: {
          number: number
          title: string
          url: string
          author: {
            login: string
            __typename: 'User' | 'Bot'
          }
        }
        pullRequestReview: {
          url: string
        }
      }>
    }
  }>
  issueContributionsByRepository: Array<{
    repository: {
      name: string
      owner: { login: string }
      description: string | null
      url: string
      createdAt: string
      isFork: boolean
      stargazerCount: number
      primaryLanguage: {
        name: string
        color: string
      } | null
    }
    contributions: {
      nodes: Array<{
        occurredAt: string
        issue: {
          number: number
          title: string
          url: string
        }
      }>
    }
  }>
  repositoryContributions: {
    nodes: RepositoryContribution[]
  }
}

export interface IssueSearchResponse {
  search: {
    nodes: Array<{
      number: number
      title: string
      url: string
      createdAt: string
      repository: {
        name: string
        owner: { login: string }
        description: string | null
        url: string
        createdAt: string
        isFork: boolean
        stargazerCount: number
        primaryLanguage: {
          name: string
          color: string
        } | null
      }
    }>
  }
}

export interface MergedPRSearchResponse {
  mergedPRs: {
    nodes: Array<{
      number: number
      title: string
      url: string
      createdAt: string
      merged: boolean
      mergedBy: {
        login: string
      }
      author: {
        login: string
      }
      repository: {
        name: string
        owner: { login: string }
        description: string | null
        url: string
        createdAt: string
        isFork: boolean
        stargazerCount: number
        primaryLanguage: {
          name: string
          color: string
        } | null
      }
    }>
  }
}

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

const GITHUB_GRAPHQL_QUERY = `
  query GetUserContributions($username: String!, $from: DateTime!, $to: DateTime!, $issueSearchQuery: String!, $mergedPRSearchQuery: String!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
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
            occurredAt
          }
        }
      }

      # Search for issues where user is involved (commented, authored, assigned, etc)
      # This excludes pull requests unlike issueComments
    }

    # Search for issues involving the user
    search(query: $issueSearchQuery, type: ISSUE, first: 100) {
      nodes {
        ... on Issue {
          number
          title
          url
          createdAt
          repository {
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
        }
      }
    }
    
    # Search for PRs merged by the user (not authored by them)
    mergedPRs: search(query: $mergedPRSearchQuery, type: ISSUE, first: 100) {
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
        }
      }
    }
  }
`

export async function fetchGitHubActivity(token: string, config: GitHubConfig): Promise<RepoActivity[]> {
  if (!token) {
    throw new Error('GitHub token is required')
  }

  const now = new Date()
  const start = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))

  const variables = {
    username: config.username,
    from: start.toISOString(),
    to: now.toISOString(),
    issueSearchQuery: `is:issue involves:${config.username} updated:>${start.toISOString().split('T')[0]}`,
    mergedPRSearchQuery: `is:pr is:merged user:${config.username} -author:${config.username} -author:app/dependabot -author:app/renovate merged:>${start.toISOString().split('T')[0]}`
  }

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': `${config.title} Activity Fetcher`
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

    const data: any = await response.json()

    if (data.errors) {
      throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}`)
    }

    if (!data.data?.user?.contributionsCollection) {
      throw new Error('Invalid response structure from GitHub API')
    }

    const contributionsCollection: ContributionsCollection = data.data.user.contributionsCollection
    const issueSearch = data.data.search
    const mergedPRSearch = data.data.mergedPRs

    return aggregateActivityByRepository(contributionsCollection, issueSearch, mergedPRSearch, config.username)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while fetching GitHub activity')
  }
}

function aggregateActivityByRepository(contributions: ContributionsCollection, issueSearch?: IssueSearchResponse['search'], mergedPRSearch?: MergedPRSearchResponse['mergedPRs'], username?: string): RepoActivity[] {
  const repoMap = new Map<string, RepoActivity>()

  // Process commit contributions (direct pushes)
  contributions.commitContributionsByRepository.forEach(repoContrib => {
    // Skip forked repositories
    if (repoContrib.repository.isFork) return
    
    const repoKey = `${repoContrib.repository.owner.login}/${repoContrib.repository.name}`
    const createdAt = new Date(repoContrib.repository.createdAt)
    
    if (repoContrib.contributions.totalCount === 0) return
    
    // Get the most recent commit activity
    let lastCommitDate = new Date(0)
    repoContrib.contributions.nodes.forEach(node => {
      const nodeDate = new Date(node.occurredAt)
      if (nodeDate > lastCommitDate) {
        lastCommitDate = nodeDate
      }
    })
    
    if (!repoMap.has(repoKey)) {
      repoMap.set(repoKey, {
        name: repoContrib.repository.name,
        owner: repoContrib.repository.owner.login,
        description: repoContrib.repository.description || '',
        url: repoContrib.repository.url,
        primaryLanguage: repoContrib.repository.primaryLanguage,
        stargazerCount: repoContrib.repository.stargazerCount,
        lastActivity: lastCommitDate,
        activitySummary: {
          prCount: 0,
          reviewCount: 0,
          issueCount: 0,
          mergeCount: 0,
          hasMergedPRs: false
        },
        createdAt
      })
    } else {
      // Update last activity if commits are more recent
      const repo = repoMap.get(repoKey)!
      if (lastCommitDate > repo.lastActivity) {
        repo.lastActivity = lastCommitDate
      }
    }
  })

  // Process PR contributions
  contributions.pullRequestContributionsByRepository.forEach(repoContrib => {
    // Skip forked repositories
    if (repoContrib.repository.isFork) return

    const repoKey = `${repoContrib.repository.owner.login}/${repoContrib.repository.name}`
    const createdAt = new Date(repoContrib.repository.createdAt)

    if (repoContrib.contributions.nodes.length === 0) return

    if (!repoMap.has(repoKey)) {
      repoMap.set(repoKey, {
        name: repoContrib.repository.name,
        owner: repoContrib.repository.owner.login,
        description: repoContrib.repository.description || '',
        url: repoContrib.repository.url,
        primaryLanguage: repoContrib.repository.primaryLanguage,
        stargazerCount: repoContrib.repository.stargazerCount,
        lastActivity: new Date(0),
        activitySummary: {
          prCount: 0,
          reviewCount: 0,
          issueCount: 0,
          mergeCount: 0,
          hasMergedPRs: false
        },
        createdAt
      })
    }

    const repo = repoMap.get(repoKey)!
    repo.activitySummary.prCount += repoContrib.contributions.nodes.length

    // Check for merged PRs
    const hasMergedPRs = repoContrib.contributions.nodes.some(contrib => contrib.pullRequest.merged)
    if (hasMergedPRs) {
      repo.activitySummary.hasMergedPRs = true
    }

    // Update last activity
    repoContrib.contributions.nodes.forEach(contrib => {
      const contributionDate = new Date(contrib.occurredAt)
      if (contributionDate > repo.lastActivity) {
        repo.lastActivity = contributionDate
      }
    })
  })

  // Process PR review contributions
  contributions.pullRequestReviewContributionsByRepository.forEach(repoContrib => {
    // Skip forked repositories
    if (repoContrib.repository.isFork) return

    const repoKey = `${repoContrib.repository.owner.login}/${repoContrib.repository.name}`
    const createdAt = new Date(repoContrib.repository.createdAt)

    // Filter out self-reviews and bot PRs
    const validReviews = repoContrib.contributions.nodes.filter(contrib =>
      contrib.pullRequest.author.login !== username &&
      contrib.pullRequest.author.__typename !== 'Bot'
    )

    if (validReviews.length === 0) return

    if (!repoMap.has(repoKey)) {
      repoMap.set(repoKey, {
        name: repoContrib.repository.name,
        owner: repoContrib.repository.owner.login,
        description: repoContrib.repository.description || '',
        url: repoContrib.repository.url,
        primaryLanguage: repoContrib.repository.primaryLanguage,
        stargazerCount: repoContrib.repository.stargazerCount,
        lastActivity: new Date(0),
        activitySummary: {
          prCount: 0,
          reviewCount: 0,
          issueCount: 0,
          mergeCount: 0,
          hasMergedPRs: false
        },
        createdAt
      })
    }

    const repo = repoMap.get(repoKey)!
    repo.activitySummary.reviewCount += validReviews.length

    // Update last activity (only from valid reviews)
    validReviews.forEach(contrib => {
      const contributionDate = new Date(contrib.occurredAt)
      if (contributionDate > repo.lastActivity) {
        repo.lastActivity = contributionDate
      }
    })
  })

  // Skip issueContributionsByRepository to avoid double-counting with search results

  // Process repository contributions (new repositories)
  contributions.repositoryContributions.nodes.forEach(contribution => {
    // Skip forked repositories
    if (contribution.repository.isFork) return

    const repoKey = `${contribution.repository.owner.login}/${contribution.repository.name}`
    const createdAt = new Date(contribution.repository.createdAt)
    const contributionDate = new Date(contribution.occurredAt)

    if (!repoMap.has(repoKey)) {
      repoMap.set(repoKey, {
        name: contribution.repository.name,
        owner: contribution.repository.owner.login,
        description: contribution.repository.description || '',
        url: contribution.repository.url,
        primaryLanguage: contribution.repository.primaryLanguage,
        lastActivity: contributionDate,
        activitySummary: {
          prCount: 0,
          reviewCount: 0,
          issueCount: 0,
          mergeCount: 0,
          hasMergedPRs: false
        },
        createdAt,
        stargazerCount: contribution.repository.stargazerCount
      })
    }
  })

  // Process issues from search (issues where user is involved)
  if (issueSearch) {
    issueSearch.nodes.forEach(issue => {
      const issueDate = new Date(issue.createdAt)

      // Skip forked repositories
      if (issue.repository.isFork) return

      const repoKey = `${issue.repository.owner.login}/${issue.repository.name}`
      const repoCreatedAt = new Date(issue.repository.createdAt)

      if (!repoMap.has(repoKey)) {
        repoMap.set(repoKey, {
          name: issue.repository.name,
          owner: issue.repository.owner.login,
          description: issue.repository.description || '',
          url: issue.repository.url,
          primaryLanguage: issue.repository.primaryLanguage,
          lastActivity: issueDate,
          activitySummary: {
            prCount: 0,
            reviewCount: 0,
            issueCount: 1,
            mergeCount: 0,
            hasMergedPRs: false
          },
          createdAt: repoCreatedAt,
          stargazerCount: issue.repository.stargazerCount
        })
      } else {
        const repo = repoMap.get(repoKey)!
        repo.activitySummary.issueCount++

        // Update last activity if this issue is more recent
        if (issueDate > repo.lastActivity) {
          repo.lastActivity = issueDate
        }
      }
    })
  }

  // Process PRs merged by the user (only for repos they own)
  if (mergedPRSearch && username) {
    mergedPRSearch.nodes.forEach(pr => {
      // Skip if not actually merged or merged by someone else
      if (!pr.merged || pr.mergedBy.login !== username) return
      
      // Skip if authored by the user (already counted in PR contributions)
      if (pr.author.login === username) return
      
      // Skip forked repositories
      if (pr.repository.isFork) return
      
      // Only count merges for repos owned by the user
      if (pr.repository.owner.login !== username) return
      
      const repoKey = `${pr.repository.owner.login}/${pr.repository.name}`
      const repoCreatedAt = new Date(pr.repository.createdAt)
      const prDate = new Date(pr.createdAt)
      
      if (!repoMap.has(repoKey)) {
        repoMap.set(repoKey, {
          name: pr.repository.name,
          owner: pr.repository.owner.login,
          description: pr.repository.description || '',
          url: pr.repository.url,
          primaryLanguage: pr.repository.primaryLanguage,
          stargazerCount: pr.repository.stargazerCount,
          lastActivity: prDate,
          activitySummary: {
            prCount: 0,
            reviewCount: 0,
            issueCount: 0,
            mergeCount: 1, // Count merged PRs separately
            hasMergedPRs: true
          },
          createdAt: repoCreatedAt
        })
      } else {
        const repo = repoMap.get(repoKey)!
        repo.activitySummary.mergeCount++ // Count merged PRs separately
        
        // Update last activity if this PR is more recent
        if (prDate > repo.lastActivity) {
          repo.lastActivity = prDate
        }
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
