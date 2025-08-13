import { fetchGitHubActivity } from "@workspace/github";
import { SITE } from "../config";
import { logger } from "@workspace/logger";

export * from "@workspace/github";

export function fetchGitHubActivityWithConfig(token: string) {
  logger.debug(
    {
      username: SITE.githubUsername,
      title: SITE.title,
    },
    "Calling GitHub service with site configuration",
  );

  return fetchGitHubActivity(token, {
    username: SITE.githubUsername,
    title: SITE.title,
  });
}
