import { fetchGitHubActivity } from '../../packages/github'
import { SITE } from '../config'

export * from '../../packages/github'

export function fetchGitHubActivityWithConfig(token: string) {
  return fetchGitHubActivity(token, {
    username: SITE.githubUsername,
    title: SITE.title
  })
}
