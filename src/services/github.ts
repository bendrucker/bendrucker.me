import { fetchGitHubActivity } from "@workspace/github";
import { SITE } from "../config";
import { logger } from "@workspace/logger";

export * from "@workspace/github";

export function fetchGitHubActivityWithConfig(token: string) {
  logger.debug("Calling GitHub service with site configuration", {
    username: SITE.githubUsername,
    title: SITE.title,
  });

  return fetchGitHubActivity(token, {
    username: SITE.githubUsername,
    title: SITE.title,
  });
}
