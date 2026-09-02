// What activity-hub's Publish entrypoint writes: the validation and the SQL,
// kept out of `src/publish.ts` so they load outside the Workers runtime, where
// `cloudflare:workers` does not resolve and a test cannot import the class.
import type { CompiledQuery } from "kysely";
import { z } from "zod";
import type { ActivityStore } from "./store";

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

const powerSource = z.enum(["measured", "estimated", "none"]);

// The schema is the definition: the type below is inferred from it, so a field
// cannot be validated one way and typed another. The hub hand-writes its own
// copy, and its tests assert the exact object it sends.
const publishedActivity = z.object({
  activityId: text,
  stravaId: nullable(text),
  name: nullable(z.string()),
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
  powerSource,
  polyline: nullable(z.string()),
  // Altitudes in metres, evenly spaced by distance. The site normalizes to
  // whatever range its chart wants and keeps these for the axis label.
  elevationProfile: nullable(z.array(z.number())),
  photoKeys: z
    .array(text)
    .nullish()
    .transform((value) => value ?? []),
});

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

export async function publishActivity(
  store: ActivityStore,
  row: unknown,
): Promise<void> {
  const activity = parse(publishedActivity, row, "activity");
  await store.db
    .insertInto("activityFeed")
    .values({
      activityId: activity.activityId,
      stravaId: activity.stravaId,
      name: activity.name,
      sport: activity.sport,
      startedAt: activity.startedAt,
      timezone: activity.timezone,
      distanceM: activity.distanceM,
      movingS: activity.movingS,
      elevationM: activity.elevationM,
      averageWatts: activity.averageWatts,
      powerSource: activity.powerSource,
      polyline: activity.polyline,
      elevationProfile:
        activity.elevationProfile === null
          ? null
          : JSON.stringify(activity.elevationProfile),
      photoKeys: JSON.stringify(activity.photoKeys),
      updatedAt: new Date().toISOString(),
    })
    .onConflict((conflict) =>
      conflict.column("activityId").doUpdateSet((eb) => ({
        stravaId: eb.ref("excluded.stravaId"),
        name: eb.ref("excluded.name"),
        sport: eb.ref("excluded.sport"),
        startedAt: eb.ref("excluded.startedAt"),
        timezone: eb.ref("excluded.timezone"),
        distanceM: eb.ref("excluded.distanceM"),
        movingS: eb.ref("excluded.movingS"),
        elevationM: eb.ref("excluded.elevationM"),
        averageWatts: eb.ref("excluded.averageWatts"),
        powerSource: eb.ref("excluded.powerSource"),
        polyline: eb.ref("excluded.polyline"),
        elevationProfile: eb.ref("excluded.elevationProfile"),
        photoKeys: eb.ref("excluded.photoKeys"),
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
