#!/usr/bin/env tsx

// Fills the local D1 and R2 with rides, so `/activity/cycling` renders
// something to look at. Rows go in through `publishActivity` and
// `publishPowerCurve`, the same functions activity-hub's Publish entrypoint
// calls, so a seeded row is shaped exactly like a published one and a schema
// change breaks this script the way it breaks the hub.
//
// Both flags write to the LOCAL database. `--remote` names where the rows are
// read from, not where they land: `npm run fetch-activity --remote` means the
// opposite, so read the flag as "the real rides" rather than "against
// production".
//
//   npm run seed              synthetic rides, three years of them
//   npm run seed -- --remote  the real rides, exported from production D1
//   npm run seed -- --reset   drop the local rides first

import { execFileSync } from "node:child_process";
import { Resvg } from "@cf-wasm/resvg/node";
import { logger } from "@workspace/logger";
import { z } from "zod";
import { connectD1 } from "./d1";
import {
  publishActivity,
  publishPowerCurve,
  type PowerBest,
  type PublishedActivity,
} from "../src/activity/publish";
import type { ActivityStore } from "../src/activity/store";
import { seedRides, type SeededRide } from "../src/test/rides";

const DATABASE = "bendrucker-activity";

/** Every seeded photo lives under this prefix, which `--reset` clears. */
const PHOTO_PREFIX = "raw/strava/";

const PHOTO_WIDTH = 960;
const PHOTO_HEIGHT = 640;

async function main(): Promise<void> {
  const remote = process.argv.includes("--remote");
  const reset = process.argv.includes("--reset");

  applyMigrations();

  const { store, env, dispose } = await connectD1();
  try {
    if (reset) {
      await clear(store, env.RAW);
    }

    const rides = remote ? exportProduction() : seedRides();
    for (const { activity, bests } of rides) {
      await publishActivity(store, activity);
      if (bests.length > 0) {
        await publishPowerCurve(store, activity.activityId, bests);
      }
    }

    const photos = await writePhotos(
      env.RAW,
      rides.flatMap((ride) => ride.activity.photoKeys),
    );

    logger.info(
      { rides: rides.length, photos, remote, reset },
      "Seeded local activity data",
    );
  } finally {
    await dispose();
  }
}

/**
 * A fresh worktree has an empty state directory, and the proxy will happily
 * open a database with no tables in it. Migrating first is what turns "no
 * rides" into "no rides yet".
 */
function applyMigrations(): void {
  execFileSync("wrangler", ["d1", "migrations", "apply", DATABASE, "--local"], {
    stdio: "inherit",
  });
}

/**
 * A re-seed is an upsert, so a row whose shape changed between runs would keep
 * its old columns. Dropping first makes the run say what the database holds.
 */
async function clear(store: ActivityStore, bucket: R2Bucket): Promise<void> {
  await store.db.deleteFrom("activityPowerCurve").execute();
  await store.db.deleteFrom("activityFeed").execute();

  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix: PHOTO_PREFIX, cursor });
    await Promise.all(
      listed.objects.map((object) => bucket.delete(object.key)),
    );
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor !== undefined);
}

// The columns as raw SQL returns them, which is snake case: the CamelCase
// plugin only reaches queries Kysely built.
const remoteActivity = z.object({
  activity_id: z.string(),
  strava_id: z.string().nullable(),
  name: z.string().nullable(),
  sport: z.string(),
  started_at: z.string(),
  timezone: z.string(),
  distance_m: z.number().nullable(),
  moving_s: z.number().nullable(),
  elevation_m: z.number().nullable(),
  average_watts: z.number().nullable(),
  power_source: z.string(),
  polyline: z.string().nullable(),
  elevation_profile: z.string().nullable(),
  photo_keys: z.string(),
});

const remoteBest = z.object({
  activity_id: z.string(),
  duration_s: z.int(),
  watts: z.number(),
});

// The stored columns are JSON text, and `publishActivity` takes the arrays the
// hub sends. Reading a production row back means undoing that once.
const storedProfile = z.array(z.number());
const storedPhotoKeys = z.array(z.string());

/** What `wrangler d1 execute --json` prints: one entry per statement. */
const queryResult = z.array(z.object({ results: z.array(z.unknown()) })).min(1);

/**
 * The real feed, read out of production D1 and written into the local one.
 * Photo bytes stay in the production bucket, so the placeholders below stand
 * in for them and the strips have something to draw.
 */
function exportProduction(): SeededRide[] {
  const activities = query(
    remoteActivity,
    "select * from activity_feed order by started_at",
  );
  const bests = query(
    remoteBest,
    "select activity_id, duration_s, watts from activity_power_curve",
  );

  const ladders = new Map<string, PowerBest[]>();
  for (const best of bests) {
    const ladder = ladders.get(best.activity_id) ?? [];
    ladder.push({ durationS: best.duration_s, watts: best.watts });
    ladders.set(best.activity_id, ladder);
  }

  return activities.map((row) => {
    const activity: PublishedActivity = {
      activityId: row.activity_id,
      stravaId: row.strava_id,
      name: row.name,
      sport: row.sport,
      startedAt: row.started_at,
      timezone: row.timezone,
      distanceM: row.distance_m,
      movingS: row.moving_s,
      elevationM: row.elevation_m,
      averageWatts: row.average_watts,
      powerSource: powerSource(row.power_source),
      polyline: row.polyline,
      elevationProfile:
        row.elevation_profile === null
          ? null
          : storedProfile.parse(JSON.parse(row.elevation_profile)),
      photoKeys: storedPhotoKeys.parse(JSON.parse(row.photo_keys)),
    };
    return { activity, bests: ladders.get(row.activity_id) ?? [] };
  });
}

function powerSource(value: string): PublishedActivity["powerSource"] {
  if (value === "measured" || value === "estimated") return value;
  return "none";
}

function query<T>(schema: z.ZodType<T>, sql: string): T[] {
  const stdout = execFileSync(
    "wrangler",
    ["d1", "execute", DATABASE, "--remote", "--json", "--command", sql],
    { encoding: "utf-8" },
  );
  const [first] = queryResult.parse(JSON.parse(stdout));
  return first!.results.map((row) => schema.parse(row));
}

/**
 * Ride photos the local bucket does not have. `/photos/[...key]` serves what
 * R2 holds and 404s otherwise, so without these every thumbnail is a broken
 * image and neither the strip nor the lightbox is reviewable.
 */
async function writePhotos(
  bucket: R2Bucket,
  keys: readonly string[],
): Promise<number> {
  const unique = [...new Set(keys)];
  for (const key of unique) {
    await bucket.put(key, await placeholder(key), {
      httpMetadata: { contentType: "image/png" },
    });
  }
  return unique.length;
}

/**
 * A landscape of hills under a sky, hued off the key so a strip of twelve is
 * twelve distinguishable photos. Drawn as shapes rather than a labelled card
 * because resvg carries no fonts and would render the text as nothing.
 */
async function placeholder(key: string): Promise<Uint8Array> {
  let hash = 0;
  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  const hue = hash % 360;
  const ridge = 0.45 + ((hash >> 9) % 100) / 500;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_WIDTH}" height="${PHOTO_HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hsl(hue, 55, 72)}"/>
      <stop offset="1" stop-color="${hsl(hue + 40, 45, 88)}"/>
    </linearGradient>
  </defs>
  <rect width="${PHOTO_WIDTH}" height="${PHOTO_HEIGHT}" fill="url(#sky)"/>
  <circle cx="${PHOTO_WIDTH * 0.74}" cy="${PHOTO_HEIGHT * 0.24}" r="${PHOTO_HEIGHT * 0.11}" fill="${hsl(hue + 200, 80, 92)}"/>
  ${hills(hue, ridge)}
</svg>`;

  const resvg = await Resvg.async(svg);
  return resvg.render().asPng();
}

/**
 * HSL as a hex triple. resvg parses the CSS Color 3 `hsl(h, s%, l%)` form and
 * not the space-separated one, so the conversion happens here rather than
 * hanging on which syntax the renderer accepts.
 */
function hsl(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const base = l - chroma / 2;
  const sextant = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][sextant]!;
  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel! + base) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Three ridgelines, each darker and lower than the one behind it. */
function hills(hue: number, ridge: number): string {
  return [0, 1, 2]
    .map((layer) => {
      const top = PHOTO_HEIGHT * (ridge + layer * 0.14);
      const peak = top - PHOTO_HEIGHT * 0.12;
      const color = hsl(
        hue + 150 + layer * 12,
        34 + layer * 8,
        52 - layer * 13,
      );
      const shift = PHOTO_WIDTH * (0.2 + layer * 0.28);
      return `<path fill="${color}" d="M0 ${top} Q ${shift} ${peak} ${PHOTO_WIDTH * 0.55} ${top} T ${PHOTO_WIDTH} ${top - PHOTO_HEIGHT * 0.04} V ${PHOTO_HEIGHT} H 0 Z"/>`;
    })
    .join("\n  ");
}

await main();
