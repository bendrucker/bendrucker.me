import {
  fetchGitHubActivity,
  type GitHubActivityResult,
} from "@workspace/github";
import { SITE } from "../config";

/**
 * The activity the site stores: its own GitHub identity, over a window. Kept
 * out of `sync.ts` so the write path can be tested without resolving the
 * GitHub client, which `npm test` does not build.
 */
export function fetchActivity(
  token: string,
  window?: { from?: Date; to?: Date },
): Promise<GitHubActivityResult> {
  return fetchGitHubActivity(token, {
    username: SITE.githubUsername,
    title: SITE.title,
    ...window,
  });
}
