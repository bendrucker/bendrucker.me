import { z } from "zod";

/**
 * Reading, Watching, and Listening: other people's work, logged in a service
 * that keeps it. None of it gets a page here, so every row links out to that
 * service or to the thing itself.
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "a YYYY-MM-DD day");

const base = {
  title: z.string().min(1),
  /** The author, the artist or host, or the season. */
  text: z.string().optional(),
  /** Your own note on it, from the service it was logged in. */
  note: z.string().optional(),
  /** The day it was last logged. Only its season shows. */
  day,
  /** Where the row leaves for. */
  url: z.url(),
  /** The service or site that URL is on, for "Opens …". */
  via: z.string().min(1),
};

export const ReadingItemSchema = z.object({
  ...base,
  type: z.enum(["Book", "Article"]),
});

export const WatchingItemSchema = z.object({
  ...base,
  type: z.enum(["Show", "Movie"]),
  /** A poster, 2:3. */
  art: z.string().min(1),
  /** The season a show's episodes belong to. */
  season: z.number().int().positive().optional(),
  /** A show's season: episodes watched out of those aired. */
  episodes: z
    .object({
      watched: z.number().int().nonnegative(),
      aired: z.number().int().positive(),
    })
    .optional(),
});

export const ListeningItemSchema = z.object({
  ...base,
  type: z.enum(["Album", "Podcast"]),
  /** A square sleeve. */
  art: z.string().min(1),
  /** The record label's color, for the disc an album slides out. */
  label: z
    .string()
    .regex(/^#[0-9a-f]{6}$/iu)
    .optional(),
  /** Only orders the highlights. It never shows. */
  plays: z.number().int().nonnegative(),
});

export type ReadingItem = z.infer<typeof ReadingItemSchema>;
export type WatchingItem = z.infer<typeof WatchingItemSchema>;
export type ListeningItem = z.infer<typeof ListeningItemSchema>;

export type MediaCategory = "reading" | "watching" | "listening";

/**
 * One row as every media route draws it. The loaders' shapes differ, and this
 * is what they have in common once a category's rules have been applied.
 */
export interface MediaRow {
  key: string;
  type: string;
  title: string;
  text?: string;
  /** A show's season, which a poster names as "S2" beside its title. */
  season?: number;
  note?: string;
  day: string;
  url: string;
  via: string;
  art?: string;
  /** Album label color. */
  label?: string;
  /** Each episode tick's watched share, 0 to 1. */
  ticks?: number[];
  tickLabel?: string;
}
