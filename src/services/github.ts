import { fetchGitHubActivity } from '@bendrucker/github'
import { SITE } from '../config'

export * from '@bendrucker/github'

export function fetchGitHubActivityWithConfig(token: string) {
  return fetchGitHubActivity(token, {
    username: SITE.githubUsername,
    title: SITE.title
  })
}
