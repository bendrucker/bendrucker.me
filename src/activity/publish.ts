// What activity-hub's Publish entrypoint writes: the validation and the SQL,
// kept out of `src/publish.ts` so they load outside the Workers runtime, where
// `cloudflare:workers` does not resolve and a test cannot import the class.
import type { CompiledQuery, Kysely } from "kysely";
import { createDb, type Database } from "../db";

// The hub branches on this name to decide whether a failure is permanent. RPC
// carries a thrown error's name and message and drops its stack.
export class ValidationError extends Error {
  override readonly name = "ValidationError";
}

export type PowerSource = "measured" | "estimated" | "none";

const POWER_SOURCES: readonly string[] = ["measured", "estimated", "none"];

// Hand-written on both sides rather than shared as a package. The hub's tests
// assert the exact object it sends, so the two definitions are checked against
// each other by those assertions rather than by a build step.
export interface PublishedActivity {
  activityId: string;
  stravaId: string | null;
  name: string | null;
  sport: string;
  startedAt: string;
  timezone: string;
  distanceM: number | null;
  movingS: number | null;
  elevationM: number | null;
  averageWatts: number | null;
  powerSource: PowerSource;
  polyline: string | null;
  // Altitudes in metres, evenly spaced by distance. The site normalizes to
  // whatever range its chart wants and keeps these for the axis label.
  elevationProfile: number[] | null;
  photoKeys: string[];
}

export interface PowerBest {
  durationS: number;
  watts: number;
}

// Kysely's D1 dialect throws on transactions, so a multi-statement write goes
// through d1.batch() instead. The store names that as its own operation, which
// is also what lets a test run these against SQLite.
export interface PublishStore {
  db: Kysely<Database>;
  batch(statements: readonly CompiledQuery[]): Promise<void>;
}

export function d1Store(d1: D1Database): PublishStore {
  return {
    db: createDb(d1),
    batch: async (statements) => {
      await d1.batch(
        statements.map((statement) =>
          d1.prepare(statement.sql).bind(...statement.parameters),
        ),
      );
    },
  };
}

export async function publishActivity(
  store: PublishStore,
  row: unknown,
): Promise<void> {
  const activity = parseActivity(row);
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
  store: PublishStore,
  activityId: unknown,
  bests: unknown,
): Promise<void> {
  const id = requireId(activityId, "activityId");
  const rows = parseBests(bests);

  const statements: CompiledQuery[] = [
    store.db
      .deleteFrom("activityPowerCurve")
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
  store: PublishStore,
  activityId: unknown,
): Promise<void> {
  const id = requireId(activityId, "activityId");
  await store.batch([
    store.db
      .deleteFrom("activityPowerCurve")
      .where("activityId", "=", id)
      .compile(),
    store.db.deleteFrom("activityFeed").where("activityId", "=", id).compile(),
  ]);
}

// Every field is checked by name rather than by casting the object, because
// the caller is any Worker holding the binding and a wrong shape should park
// as a permanent failure instead of writing a half-formed row.
function parseActivity(value: unknown): PublishedActivity {
  const row = requireObject(value, "activity");
  const powerSource = requireString(row.powerSource, "powerSource");
  if (!POWER_SOURCES.includes(powerSource)) {
    throw new ValidationError(
      `powerSource must be one of ${POWER_SOURCES.join(", ")}`,
    );
  }

  return {
    activityId: requireId(row.activityId, "activityId"),
    stravaId: optionalString(row.stravaId, "stravaId"),
    name: optionalString(row.name, "name"),
    sport: requireId(row.sport, "sport"),
    startedAt: requireTimestamp(row.startedAt, "startedAt"),
    timezone: requireId(row.timezone, "timezone"),
    distanceM: optionalNumber(row.distanceM, "distanceM"),
    movingS: optionalNumber(row.movingS, "movingS"),
    elevationM: optionalNumber(row.elevationM, "elevationM"),
    averageWatts: optionalNumber(row.averageWatts, "averageWatts"),
    powerSource: powerSource as PowerSource,
    polyline: optionalString(row.polyline, "polyline"),
    elevationProfile: parseElevation(row.elevationProfile),
    photoKeys: parsePhotoKeys(row.photoKeys),
  };
}

function parseElevation(value: unknown): number[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new ValidationError("elevationProfile must be an array or null");
  }
  return value.map((entry, index) =>
    requireNumber(entry, `elevationProfile[${index}]`),
  );
}

function parsePhotoKeys(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ValidationError("photoKeys must be an array");
  }
  return value.map((entry, index) => requireId(entry, `photoKeys[${index}]`));
}

function parseBests(value: unknown): PowerBest[] {
  if (!Array.isArray(value)) {
    throw new ValidationError("bests must be an array");
  }
  const seen = new Set<number>();
  return value.map((entry, index) => {
    const best = requireObject(entry, `bests[${index}]`);
    const durationS = requireNumber(
      best.durationS,
      `bests[${index}].durationS`,
    );
    if (!Number.isInteger(durationS) || durationS <= 0) {
      throw new ValidationError(
        `bests[${index}].durationS must be a positive integer`,
      );
    }
    if (seen.has(durationS)) {
      throw new ValidationError(`bests repeats duration ${durationS}`);
    }
    seen.add(durationS);
    return {
      durationS,
      watts: requireNumber(best.watts, `bests[${index}].watts`),
    };
  });
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  return value;
}

function requireId(value: unknown, field: string): string {
  const text = requireString(value, field);
  if (text.length === 0) {
    throw new ValidationError(`${field} must not be empty`);
  }
  return text;
}

function optionalString(value: unknown, field: string): string | null {
  return value === null || value === undefined
    ? null
    : requireString(value, field);
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a finite number`);
  }
  return value;
}

function optionalNumber(value: unknown, field: string): number | null {
  return value === null || value === undefined
    ? null
    : requireNumber(value, field);
}

function requireTimestamp(value: unknown, field: string): string {
  const text = requireId(value, field);
  if (!Number.isFinite(Date.parse(text))) {
    throw new ValidationError(`${field} must be a parseable timestamp`);
  }
  return text;
}
