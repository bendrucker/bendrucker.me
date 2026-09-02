import { getDb } from "@/db";
import { formatReposMarkdown } from "@/activity/markdown";
import {
  queryRepos,
  queryYearRepos,
  queryYearsByLastActivity,
} from "@/activity/query";
import type { Representation } from "./types";

export const activity: Representation = {
  route: "/activity/code",
  section: "Activity",

  async render() {
    const { repos, total } = await queryRepos(await getDb(), {});
    return formatReposMarkdown(repos, total);
  },

  list: async () => [
    {
      path: "/activity/code",
      title: "Code Activity",
      description: "Public GitHub activity, indexed by repository.",
    },
  ],
};

export const activityYear: Representation = {
  route: "/activity/code/[year]",
  section: "Activity",

  async render({ params }) {
    const result = await queryYearRepos(await getDb(), Number(params.year));
    if (!result.found) return null;

    return formatReposMarkdown(result.repos, result.total, {
      year: result.year,
    });
  },

  async list() {
    const { years } = await queryYearsByLastActivity(await getDb());
    return years.map(({ year, count }) => ({
      path: `/activity/code/${year}`,
      title: `Code Activity: ${year}`,
      description: `${count} ${count === 1 ? "repository" : "repositories"} last contributed to in ${year}.`,
    }));
  },
};
