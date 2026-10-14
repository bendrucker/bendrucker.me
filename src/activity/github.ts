import {
  fetchGitHubActivity,
  fetchWorkItems,
  type GitHubActivityResult,
  type RepoActivity,
  type WorkItems,
} from "@workspace/github";
import type { Kysely } from "kysely";
import { SITE } from "../config";
import type { Database } from "../db";
import { queryWorkToFetch } from "./work";

/**
 * The activity the site stores: its own GitHub identity, over a window. Kept
 * out of `sync.ts` so the write path can be tested without resolving the
 * GitHub client, which `npm test` does not build.
 */
export async function fetchActivity(
  token: string,
  window?: { from?: Date; to?: Date },
): Promise<GitHubActivityResult> {
  return fetchGitHubActivity(token, {
    username: SITE.githubUsername,
    title: SITE.title,
    ...window,
  });
}

/** The authored pull requests and issues behind a list of node ids. */
export async function fetchWorkByIds(
  token: string,
  ids: readonly string[],
): Promise<WorkItems> {
  if (ids.length === 0) return { pullRequests: [], issues: [] };
  return fetchWorkItems(token, ids, SITE.title);
}

/**
 * The details a sync of these repos needs: the authored items the payload
 * names that are not yet stored merged or closed, and every stored open one,
 * so a merge or close reaches the row after the window has moved past it.
 */
export async function fetchWork(
  token: string,
  db: Kysely<Database>,
  repos: readonly RepoActivity[],
): Promise<WorkItems> {
  return fetchWorkByIds(token, await queryWorkToFetch(db, repos));
}
