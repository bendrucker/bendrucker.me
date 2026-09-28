// What activity-hub's Publish entrypoint writes: the validation and the SQL,
// kept out of `src/publish.ts` so they load outside the Workers runtime, where
// `cloudflare:workers` does not resolve and a test cannot import the class.
import type { CompiledQuery } from "kysely";
import { z } from "zod";
import type { ActivityStore } from "./store";
import { temperatureRange } from "./temperature";
import { MAX_PROFILE_SAMPLES, thin, thinPolyline } from "./track";

// The hub branches on this name to decide whether a failure is permanent. RPC
// carries a thrown error's name and message and drops its stack.
export class ValidationError extends Error {
  override readonly name = "ValidationError";
}

const text = z.string().min(1);

// A field the hub may send as null or omit entirely, stored either way as the
// null the column holds.
function nullable<T extends z.ZodType>(schema: T) {
  return schema.nullish().transform((value) => value ?? null);
}

// SQLite has no boolean, and D1 and better-sqlite3 disagree on binding one.
const flag = z.boolean().transform(Number);

const powerSource = z.enum(["measured", "estimated", "none"]);

// The schema is the definition: the type below is inferred from it, so a field
// cannot be validated one way and typed another. The hub hand-writes its own
// copy, and its tests assert the exact object it sends.
const publishedActivity = z.object({
  activityId: text,
  stravaId: nullable(text),
  name: nullable(z.string()),
  // Blank is the same as none, so a ride never shows an empty dek. The hub
  // sends it only once it has one, so the key is optional here as well.
  description: z
    .string()
    .transform((value) => value.trim() || null)
    .nullish(),
  sport: text,
  startedAt: text.refine(
    (value) => Number.isFinite(Date.parse(value)),
    "must be a parseable timestamp",
  ),
  timezone: text,
  distanceM: nullable(z.number()),
  movingS: nullable(z.number()),
  elevationM: nullable(z.number()),
  averageWatts: nullable(z.number()),
  // The three below arrive only from a hub that derives them, so each is
  // optional and an older payload still validates. Normalized power is
  // Coggan's: the fourth root of the mean fourth power of a 30-second rolling
  // average over the zero-filled 1 Hz grid the power bests already use.
  normalizedWatts: z.number().nullish(),
  averageHeartRate: z.number().nullish(),
  // Temperature and speed pairs (°C, m/s) from the record, so the range is cut
  // here by one rule rather than restated in the hub's SQL. Every tenth
  // record, like the track, is plenty for a percentile.
  temperatureSamples: z.array(z.tuple([z.number(), z.number()])).nullish(),
  powerSource,
  polyline: nullable(z.string()),
  // Altitudes in metres, evenly spaced by distance. The site normalizes to
  // whatever range its chart wants and keeps these for the axis label.
  elevationProfile: nullable(z.array(z.number())),
  photoKeys: z
    .array(text)
    .nullish()
    .transform((value) => value ?? []),
  // Optional so a hub that predates the flag still publishes. A publish
  // without it keeps whatever the row already holds.
  indoor: z.boolean().optional(),
});

// Parses straight to column values. The schema is strict, so a hub sending a
// field this site does not store yet fails rather than having it dropped.
const activityUpdate = z.strictObject({ indoor: flag });

const powerBests = z
  .array(z.object({ durationS: z.int().positive(), watts: z.number() }))
  .refine(
    (bests) =>
      new Set(bests.map((best) => best.durationS)).size === bests.length,
    "must not repeat a duration",
  );

export type PowerSource = z.infer<typeof powerSource>;
export type PublishedActivity = z.infer<typeof publishedActivity>;
export type PowerBest = z.infer<typeof powerBests>[number];
export type ActivityUpdate = z.input<typeof activityUpdate>;

export async function publishActivity(
  store: ActivityStore,
  row: unknown,
): Promise<void> {
  const activity = parse(publishedActivity, row, "activity");
  const temperature = activity.temperatureSamples
    ? temperatureRange(activity.temperatureSamples)
    : null;
  // The hub sends every point the head unit logged. A card draws a few
  // hundred, and a season of full tracks is more than one request can hold,
  // so the track is thinned once here rather than on every read.
  await store.db
    .insertInto("activityFeed")
    .values({
      activityId: activity.activityId,
      stravaId: activity.stravaId,
      name: activity.name,
      description: activity.description ?? null,
      sport: activity.sport,
      startedAt: activity.startedAt,
      timezone: activity.timezone,
      distanceM: activity.distanceM,
      movingS: activity.movingS,
      elevationM: activity.elevationM,
      averageWatts: activity.averageWatts,
      normalizedWatts: activity.normalizedWatts ?? null,
      averageHeartRate: activity.averageHeartRate ?? null,
      temperatureLowC: temperature?.lowC ?? null,
      temperatureHighC: temperature?.highC ?? null,
      powerSource: activity.powerSource,
      polyline:
        activity.polyline === null ? null : thinPolyline(activity.polyline),
      elevationProfile:
        activity.elevationProfile === null
          ? null
          : JSON.stringify(
              thin(activity.elevationProfile, MAX_PROFILE_SAMPLES),
            ),
      photoKeys: JSON.stringify(activity.photoKeys),
      indoor: activity.indoor === undefined ? null : Number(activity.indoor),
      updatedAt: new Date().toISOString(),
    })
    .onConflict((conflict) =>
      conflict.column("activityId").doUpdateSet((eb) => ({
        stravaId: eb.ref("excluded.stravaId"),
        name: eb.ref("excluded.name"),
        description: eb.ref("excluded.description"),
        sport: eb.ref("excluded.sport"),
        startedAt: eb.ref("excluded.startedAt"),
        timezone: eb.ref("excluded.timezone"),
        distanceM: eb.ref("excluded.distanceM"),
        movingS: eb.ref("excluded.movingS"),
        elevationM: eb.ref("excluded.elevationM"),
        averageWatts: eb.ref("excluded.averageWatts"),
        normalizedWatts: eb.ref("excluded.normalizedWatts"),
        averageHeartRate: eb.ref("excluded.averageHeartRate"),
        temperatureLowC: eb.ref("excluded.temperatureLowC"),
        temperatureHighC: eb.ref("excluded.temperatureHighC"),
        powerSource: eb.ref("excluded.powerSource"),
        polyline: eb.ref("excluded.polyline"),
        elevationProfile: eb.ref("excluded.elevationProfile"),
        photoKeys: eb.ref("excluded.photoKeys"),
        indoor: eb.fn.coalesce("excluded.indoor", "activityFeed.indoor"),
        updatedAt: eb.ref("excluded.updatedAt"),
      })),
    )
    .execute();
}

// Replaces the whole ladder rather than merging into it, so a rebuild that
// produces fewer durations does not leave the dropped ones behind. The delete
// and the insert travel together because a delete that landed alone would
// blank the curve.
export async function publishPowerCurve(
  store: ActivityStore,
  activityId: unknown,
  bests: unknown,
): Promise<void> {
  const id = parse(text, activityId, "activityId");
  const rows = parse(powerBests, bests, "bests");

  // The feed's cache validator is the activity table's latest write, so a
  // curve that lands after its activity has to move that write or a cached
  // page keeps revalidating against the curve it rendered without.
  const statements: CompiledQuery[] = [
    store.db
      .deleteFrom("activityPowerCurve")
      .where("activityId", "=", id)
      .compile(),
    store.db
      .updateTable("activityFeed")
      .set({ updatedAt: new Date().toISOString() })
      .where("activityId", "=", id)
      .compile(),
  ];
  if (rows.length > 0) {
    statements.push(
      store.db
        .insertInto("activityPowerCurve")
        .values(
          rows.map((best) => ({
            activityId: id,
            durationS: best.durationS,
            watts: best.watts,
          })),
        )
        .compile(),
    );
  }
  await store.batch(statements);
}

/**
 * Sets the whitelisted scalar columns on a row that already exists, so a field
 * added after the hub's first publish can be backfilled without replaying the
 * whole payload. An activity that was never published is left unwritten.
 */
export async function updateActivity(
  store: ActivityStore,
  activityId: unknown,
  fields: unknown,
): Promise<void> {
  const id = parse(text, activityId, "activityId");
  const columns = parse(activityUpdate, fields, "fields");
  // The feed's cache validator is the latest `updatedAt`, so the update moves
  // it along with the columns it sets.
  await store.batch([
    store.db
      .updateTable("activityFeed")
      .set({ ...columns, updatedAt: new Date().toISOString() })
      .where("activityId", "=", id)
      .compile(),
  ]);
}

// The power curve goes explicitly rather than through the foreign key's
// cascade, which only fires where D1 has foreign keys enabled.
export async function deleteActivity(
  store: ActivityStore,
  activityId: unknown,
): Promise<void> {
  const id = parse(text, activityId, "activityId");
  await store.batch([
    store.db
      .deleteFrom("activityPowerCurve")
      .where("activityId", "=", id)
      .compile(),
    store.db.deleteFrom("activityFeed").where("activityId", "=", id).compile(),
  ]);
}

// The caller is any Worker holding the binding, so a wrong shape has to park as
// a permanent failure rather than write a half-formed row. Restating the
// failure as a ValidationError is what tells the hub which of the two it is.
function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  throw new ValidationError(describe(result.error, label));
}

// The first issue, addressed the way the hub names the field, so a rejection
// reads as `bests[2].durationS: ...` in the derived row the hub records.
function describe(error: z.ZodError, label: string): string {
  const [issue] = error.issues;
  if (issue === undefined) {
    return `${label} is invalid`;
  }
  const path = issue.path
    .map((segment, index) =>
      typeof segment === "number"
        ? `[${segment}]`
        : index === 0
          ? String(segment)
          : `.${String(segment)}`,
    )
    .join("");
  return `${path === "" ? label : path}: ${issue.message}`;
}
