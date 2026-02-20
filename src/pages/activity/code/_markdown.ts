import type { Repo } from "@/components/activity/composables/useActivityApi";

export function formatReposMarkdown(
  repos: Repo[],
  total: number,
  options?: { year?: number },
): string {
  const title = options?.year
    ? `# Code Activity: ${options.year}`
    : "# Code Activity";

  const lines = [title, "", `${total} repositories.`];

  for (const repo of repos) {
    lines.push("", `## ${repo.owner}/${repo.name}`);
    if (repo.description) {
      lines.push("", repo.description);
    }
    lines.push("");

    const details: string[] = [];
    if (repo.primaryLanguage) {
      details.push(`- Language: ${repo.primaryLanguage.name}`);
    }
    if (repo.stargazerCount > 0) {
      details.push(`- Stars: ${repo.stargazerCount}`);
    }
    details.push(`- Last active: ${repo.lastActivity.split("T")[0]}`);

    const activity: string[] = [];
    if (repo.activitySummary.prCount > 0)
      activity.push(`PRs: ${repo.activitySummary.prCount}`);
    if (repo.activitySummary.reviewCount > 0)
      activity.push(`Reviews: ${repo.activitySummary.reviewCount}`);
    if (repo.activitySummary.issueCount > 0)
      activity.push(`Issues: ${repo.activitySummary.issueCount}`);
    if (activity.length > 0) {
      details.push(`- ${activity.join(", ")}`);
    }

    lines.push(...details);
  }

  lines.push("");
  return lines.join("\n");
}
