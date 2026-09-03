// The wire shape of `/activity/cycling/<month>.json`. `response.json()` is
// untyped and `typescript/no-unsafe-type-assertion` rules out asserting it, so
// the browser parses a page through this schema and gets a `LogPage` back.
//
// `satisfies z.ZodType<LogPage>` catches a schema whose output the type would
// not accept. `log-page.test.ts` covers the other direction, where the schema
// has quietly stopped describing a field the type still carries.
import { z } from "zod";
import { badgeKinds, iconNames, type LogPage } from "./types";

const photo = z.object({
  id: z.string(),
  thumbnailUrl: z.string(),
  fullUrl: z.string(),
  alt: z.string(),
});

const badge = z.object({
  icon: z.enum(iconNames).optional(),
  label: z.string(),
  kind: z.enum(badgeKinds),
  scope: z.string().optional(),
});

const fact = z.object({
  icon: z.enum(iconNames).optional(),
  label: z.string(),
  id: z.string(),
});

const ride = z.object({
  id: z.string(),
  name: z.string(),
  stravaUrl: z.string().optional(),
  startedAt: z.string(),
  distanceMi: z.number().optional(),
  elevationFt: z.number().optional(),
  movingSeconds: z.number().optional(),
  averageWatts: z.number().optional(),
  companionCount: z.number().optional(),
  // Both arrive encoded, so the schema checks that they are strings and leaves
  // decoding to `geo.ts` and `profile.ts`.
  route: z.string().optional(),
  elevationProfile: z.string().optional(),
  photos: z.array(photo),
  badges: z.array(badge),
  facts: z.array(fact),
});

const monthGroup = z.object({
  key: z.string(),
  label: z.string(),
  distanceMi: z.number(),
  elevationFt: z.number(),
  rideCount: z.number(),
  rides: z.array(ride),
  commuteCount: z.number(),
});

export const logPage = z.object({
  months: z.array(monthGroup),
  logCursor: z.string().nullable(),
}) satisfies z.ZodType<LogPage>;
