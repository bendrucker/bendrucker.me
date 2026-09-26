#!/usr/bin/env tsx

// Recomputes every ride's climbs from its stored route and profile, names
// them the way a publish does, and replaces `activity_climb`. Run it once
// after the climb rule or the naming rule changes, since publish only
// rewrites the climbs of a ride the hub sends again.
//
//   npm run backfill:climbs -- --dry-run   print the climbs without writing them
//   npm run backfill:climbs                rewrite production
//   npm run backfill:climbs -- --local     rewrite the local database
//
// Every name Overpass returns is kept in `tmp/climb-names.json`, so a run that
// stops partway resumes where it left off, and the write after a dry run
// stores the names the dry run printed without asking again.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
  summitKey,
  type NamedClimb,
  type StoredClimb,
} from "../src/activity/publish";
import { decodePolyline } from "../src/activity/track";
import { executeD1, formatSql, queryD1, type D1Target } from "./d1";

/**
 * Overpass hands each client a couple of slots and refuses connections from
 * one that keeps asking after a 429, which 1.5 s between `out geom` queries
 * was enough to trigger.
 */
const LOOKUP_INTERVAL_MS = 5000;
const LOOKUP_ATTEMPTS = 6;
const LOOKUP_BACKOFF_MS = 15_000;
const LOOKUP_TIMEOUT_MS = 30_000;
const RETRY_STATUSES = new Set([429, 504]);

const NAMES_FILE = join(process.cwd(), "tmp", "climb-names.json");
const cachedNames = z.record(z.string(), z.string().nullable());

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

  const nameClimbs = cachedNamer(strictNamer());
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
 * Publish's namer, spaced out and retried, and throwing where publish would
 * settle for nulls. `lookupClimbNames` reads a failed request as a ride with
 * nothing to name, and a backfill storing that for every ride is worse than
 * one that stops.
 */
function strictNamer(): ClimbNamer {
  let last = 0;
  let failure: string | null = null;
  const retrying: typeof fetch = async (input, init) => {
    for (let attempt = 1; ; attempt++) {
      await delay(Math.max(0, last + LOOKUP_INTERVAL_MS - Date.now()));
      last = Date.now();
      let reason: string;
      try {
        const response = await fetch(input, {
          ...init,
          // The caller's timeout spans every attempt and would lapse during
          // the backoff, so each attempt carries its own.
          signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        });
        if (response.ok) return response;
        if (!RETRY_STATUSES.has(response.status)) {
          failure = `Overpass answered ${response.status}`;
          return response;
        }
        reason = `status ${response.status}`;
      } catch (error) {
        reason = error instanceof Error ? error.message : String(error);
      }
      if (attempt === LOOKUP_ATTEMPTS) {
        failure = `Overpass failed ${attempt} times, last with ${reason}`;
        throw new Error(failure);
      }
      const backoff = LOOKUP_BACKOFF_MS * 2 ** (attempt - 1);
      logger.warn(
        { reason, attempt, backoff },
        "Overpass lookup failed, retrying",
      );
      await delay(backoff);
    }
  };
  return async (summits) => {
    const names = await lookupClimbNames(summits, retrying);
    if (failure !== null) {
      throw new Error(`${failure}. Rerun to resume from ${NAMES_FILE}.`);
    }
    return names;
  };
}

/**
 * Answers a summit from the names file when it can, and records every answer
 * `inner` gives, null included, as soon as it arrives.
 */
function cachedNamer(inner: ClimbNamer): ClimbNamer {
  const names = new Map(
    Object.entries(
      existsSync(NAMES_FILE)
        ? cachedNames.parse(JSON.parse(readFileSync(NAMES_FILE, "utf-8")))
        : {},
    ),
  );
  return async (summits) => {
    const missing = summits.filter((summit) => !names.has(summitKey(summit)));
    if (missing.length > 0) {
      const looked = await inner(missing);
      for (const [index, summit] of missing.entries()) {
        names.set(summitKey(summit), looked[index] ?? null);
      }
      writeFileSync(
        NAMES_FILE,
        `${JSON.stringify(Object.fromEntries(names))}\n`,
      );
    }
    return summits.map((summit) => names.get(summitKey(summit)) ?? null);
  };
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
