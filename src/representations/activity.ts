import { getDb } from "@/db";
import { formatReposMarkdown } from "@/pages/activity/code/_markdown";
import {
  queryRepos,
  queryYearsByLastActivity,
} from "@/pages/activity/code/_query";
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
    const year = Number(params.year);
    if (!Number.isInteger(year)) return null;

    // `all` matches the HTML page, which lists every repository for the year
    // rather than the first page of them.
    const { repos, total } = await queryRepos(await getDb(), {
      year,
      all: true,
    });
    if (total === 0) return null;

    return formatReposMarkdown(repos, total, { year });
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
