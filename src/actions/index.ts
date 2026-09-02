import { defineAction } from "astro:actions";
import { languagesInput, reposInput, yearsInput } from "@/activity/filters";
import { queryLanguages, queryRepos, queryYears } from "@/activity/query";
import { getDb } from "@/db";

export const server = {
  fetchRepos: defineAction({
    input: reposInput,
    handler: async (input) => {
      const db = await getDb();
      return queryRepos(db, input);
    },
  }),

  fetchLanguages: defineAction({
    input: languagesInput,
    handler: async (input) => {
      const db = await getDb();
      return queryLanguages(db, input);
    },
  }),

  fetchYears: defineAction({
    input: yearsInput,
    handler: async (input) => {
      const db = await getDb();
      return queryYears(db, input);
    },
  }),
};
