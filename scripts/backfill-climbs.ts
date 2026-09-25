#!/usr/bin/env tsx

// Recomputes every ride's climbs from its stored route and profile, names
// them the way a publish does, and replaces `activity_climb`. Run it once
// after the climb rule or the naming rule changes, since publish only
// rewrites the climbs of a ride the hub sends again.
//
//   npm run backfill:climbs -- --dry-run   print the climbs without writing them
//   npm run backfill:climbs                rewrite production
//   npm run backfill:climbs -- --local     rewrite the local database

import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import {
  CamelCasePlugin,
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
} from "kysely";
import { logger } from "@workspace/logger";
import { z } from "zod";
import type { Database } from "../src/db";
import { findClimbs } from "../src/activity/climb";
import { lookupClimbNames, type ClimbNamer } from "../src/activity/climb-name";
import {
  climbStatements,
  nameStoredClimbs,
  type NamedClimb,
  type StoredClimb,
} from "../src/activity/publish";
import { decodePolyline } from "../src/activity/track";
import { executeD1, formatSql, queryD1, type D1Target } from "./d1";

/** Overpass asks for no more than one or two requests at a time per client. */
const LOOKUP_INTERVAL_MS = 1500;
const LOOKUP_ATTEMPTS = 5;
const LOOKUP_TIMEOUT_MS = 20_000;
const RETRY_STATUSES = new Set([429, 504]);

const FEET_PER_METER = 3.28084;

const storedRide = z.object({
  activity_id: z.string(),
  name: z.string().nullable(),
  started_at: z.string(),
  polyline: z.string().nullable(),
  elevation_profile: z.string().nullable(),
});

const storedClimb = z.object({
  activity_id: z.string(),
  summit_lat: z.number(),
  summit_lng: z.number(),
  name: z.string().nullable(),
});

const storedProfile = z.array(z.number());

// Compiles statements for wrangler to run, with no connection of its own.
const db = new Kysely<Database>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (kysely) => new SqliteIntrospector(kysely),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  },
  plugins: [new CamelCasePlugin()],
});

interface Backfilled {
  ride: z.infer<typeof storedRide>;
  climbs: NamedClimb[];
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      local: { type: "boolean", default: false },
    },
  });
  const target: D1Target = values.local ? "local" : "remote";

  const rides = queryD1(
    storedRide,
    "select activity_id, name, started_at, polyline, elevation_profile from activity_feed where sport = 'ride' order by started_at",
    target,
  );
  const stored = Map.groupBy(
    queryD1(
      storedClimb,
      "select activity_id, summit_lat, summit_lng, name from activity_climb",
      target,
    ),
    (climb) => climb.activity_id,
  );

  const nameClimbs = pacedNamer();
  const backfilled: Backfilled[] = [];
  for (const ride of rides) {
    const climbs =
      ride.polyline === null || ride.elevation_profile === null
        ? []
        : findClimbs(
            storedProfile.parse(JSON.parse(ride.elevation_profile)),
            decodePolyline(ride.polyline),
          );
    backfilled.push({
      ride,
      climbs: await nameStoredClimbs(
        climbs,
        (stored.get(ride.activity_id) ?? []).map((climb): StoredClimb => ({
          summitLat: climb.summit_lat,
          summitLng: climb.summit_lng,
          name: climb.name,
        })),
        nameClimbs,
      ),
    });
  }

  if (values["dry-run"]) {
    printTable(backfilled);
    return;
  }

  const now = new Date().toISOString();
  const statements = backfilled.flatMap(({ ride, climbs }) =>
    rideStatements(ride.activity_id, climbs, now),
  );
  executeD1(
    statements.map((statement) => formatSql(statement)),
    target,
  );
  logger.info(
    {
      rides: backfilled.length,
      climbs: backfilled.reduce(
        (total, { climbs }) => total + climbs.length,
        0,
      ),
      target,
    },
    "Backfilled climbs",
  );
}

/**
 * The same replacement a publish makes, plus a bump of the ride's
 * `updated_at`, which is what moves the feed's cache validator.
 */
function rideStatements(
  activityId: string,
  climbs: NamedClimb[],
  now: string,
): CompiledQuery[] {
  return [
    ...climbStatements(db, activityId, climbs),
    db
      .updateTable("activityFeed")
      .set({ updatedAt: now })
      .where("activityId", "=", activityId)
      .compile(),
  ];
}

/**
 * Publish's namer, spaced out and retried. Overpass answers a burst with 429
 * and a busy moment with 504, and `lookupClimbNames` reads either as a ride
 * with nothing to name.
 */
function pacedNamer(): ClimbNamer {
  let last = 0;
  const retrying: typeof fetch = async (input, init) => {
    for (let attempt = 1; ; attempt++) {
      await delay(Math.max(0, last + LOOKUP_INTERVAL_MS - Date.now()));
      last = Date.now();
      const response = await fetch(input, {
        ...init,
        // The caller's timeout spans every attempt and would lapse during
        // the backoff, so each attempt carries its own.
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      });
      if (!RETRY_STATUSES.has(response.status) || attempt === LOOKUP_ATTEMPTS) {
        return response;
      }
      const backoff = 2 ** attempt * 1000;
      logger.warn(
        { status: response.status, attempt, backoff },
        "Overpass is busy, retrying",
      );
      await delay(backoff);
    }
  };
  return async (summits) => lookupClimbNames(summits, retrying);
}

function printTable(backfilled: Backfilled[]): void {
  const rows = backfilled
    .flatMap(({ ride, climbs }) =>
      climbs.map((climb, position) => ({ ride, climb, position })),
    )
    .toSorted((a, b) => b.climb.gainM - a.climb.gainM)
    .map(({ ride, climb, position }) => [
      ride.name ?? ride.activity_id,
      ride.started_at.slice(0, 10),
      String(position),
      String(Math.round(climb.gainM * FEET_PER_METER)),
      climb.name ?? "",
    ]);
  const table = [["ride", "date", "pos", "gain ft", "name"], ...rows];
  const widths = table[0]!.map((_, column) =>
    Math.max(...table.map((row) => row[column]!.length)),
  );
  const numeric = new Set([2, 3]);
  for (const row of table) {
    const cells = row.map((cell, column) =>
      numeric.has(column)
        ? cell.padStart(widths[column]!)
        : cell.padEnd(widths[column]!),
    );
    process.stdout.write(`${cells.join("  ").trimEnd()}\n`);
  }
}

await main();
