import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { SITE } from "@/config";

const blog = defineCollection({
  // `_`-prefixed files and directories are drafts. Excluding them here is what
  // makes a post's `id` its slug, since the loader slugifies the path it keeps.
  loader: glob({
    pattern: ["**/*.md", "!**/_*", "!**/_*/**"],
    base: "./src/content/blog",
  }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      timezone: z.string().optional(),
    }),
});

export const collections = { blog };
