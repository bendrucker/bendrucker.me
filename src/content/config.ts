import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    publishDate: z.coerce.date(),
    categories: z.string().optional(),
    series: z.string().optional(),
    // Remove template field as it's not needed in Astro
  }),
});

export const collections = { blog };