import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { getDb } from "@/db";
import {
  queryRepos,
  queryLanguages,
  queryYears,
} from "@/pages/activity/code/_query";

export const server = {
  fetchRepos: defineAction({
    input: z.object({
      cursor: z.string().nullish(),
      sort: z.enum(["recent", "active", "stars", "name"]).default("recent"),
      owner: z.enum(["personal", "external"]).nullish(),
      language: z.string().nullish(),
      search: z.string().nullish(),
      year: z.number().int().min(2000).nullish(),
    }),
    handler: async (input, context) => {
      const db = getDb(context.locals);
      return queryRepos(db, input);
    },
  }),

  fetchLanguages: defineAction({
    input: z.object({
      owner: z.enum(["personal", "external"]).nullish(),
      search: z.string().nullish(),
      year: z.number().int().min(2000).nullish(),
    }),
    handler: async (input, context) => {
      const db = getDb(context.locals);
      return queryLanguages(db, input);
    },
  }),

  fetchYears: defineAction({
    input: z.object({
      owner: z.enum(["personal", "external"]).nullish(),
      language: z.string().nullish(),
      search: z.string().nullish(),
    }),
    handler: async (input, context) => {
      const db = getDb(context.locals);
      return queryYears(db, input);
    },
  }),
};
