// The filter vocabulary the activity read model speaks, defined once. Actions
// take these schemas as their `input`, the query functions take the types
// inferred from them, and the filter controls' state is typed from the same
// constants, so a value the controls can produce is a value the query has a
// case for.
//
// `astro/zod` re-exports `zod/v4` from the copy of `zod` this package already
// depends on, so a schema built here is the same class Astro Actions validate
// with. Importing `zod` keeps this file in one dialect with `publish.ts` and
// keeps the schemas usable outside Astro.
import { z } from "zod";
import { OWNER_FILTERS, SORT_ORDERS } from "./types";

// A filter the controls clear rather than remove: they hold a null for "not
// filtering", and the query wants the key absent.
function cleared<T extends z.ZodType>(schema: T) {
  return schema
    .nullish()
    .transform((value) => value ?? undefined)
    .optional();
}

// Text the controls clear to an empty string, which filters nothing and so is
// the same as no filter at all.
const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || undefined)
  .optional();

// "all" is the owner control's value for an unfiltered owner, and an omitted
// owner means the same to the query, so the schema takes either and the
// controls hand their state to an action untranslated.
const owner = z
  .enum(OWNER_FILTERS)
  .nullish()
  .transform((value) => (value == null || value === "all" ? undefined : value))
  .optional();

// GitHub predates the site by a long way, but nothing in this database does.
export const MIN_ACTIVITY_YEAR = 2000;

// The upper bound moves with the clock rather than being a constant: a
// contribution lands in next year as soon as a timezone ahead of the server
// crosses into it.
export const activityYear = z
  .int()
  .min(MIN_ACTIVITY_YEAR)
  .refine((year) => year <= new Date().getFullYear() + 1, {
    error: "is too far in the future",
  });

const filters = z.object({
  owner,
  language: text,
  search: text,
  year: cleared(activityYear),
});

export type ActivityFilters = z.infer<typeof filters>;

export const reposInput = filters.extend({
  cursor: cleared(z.string()),
  sort: z.enum(SORT_ORDERS).default("recent"),
});

// The language bar counts repositories across languages, so the language it
// would filter on is the one input it does not take.
export const languagesInput = filters.omit({ language: true });

export const yearsInput = filters.omit({ year: true });
