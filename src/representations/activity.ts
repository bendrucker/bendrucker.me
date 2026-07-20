import { getDb } from "@/db";
import { formatReposMarkdown } from "@/pages/activity/code/_markdown";
import { queryRepos } from "@/pages/activity/code/_query";
import type { Representation } from "./types";

export const activity: Representation = {
  route: "/activity/code",
  async render() {
    const { repos, total } = await queryRepos(await getDb(), {});
    return formatReposMarkdown(repos, total);
  },
};

export const activityYear: Representation = {
  route: "/activity/code/[year]",
  async render({ params }) {
    const year = Number(params.year);
    if (!Number.isInteger(year)) return null;

    const { repos, total } = await queryRepos(await getDb(), { year });
    if (total === 0) return null;

    return formatReposMarkdown(repos, total, { year });
  },
};
