// Rides in the shape activity-hub publishes them, so `npm run seed` fills a
// local D1 through the same write path production uses. The story fixtures take
// their route generator from here too: one generator for the story book and the
// seed, so a route that reads as a road in one reads as one in the other.
import type { PowerBest, PublishedActivity } from "@/activity/publish";
import { encodePolyline } from "@/activity/track";
import type { Coordinate } from "@/activity/types";
import { seededRandom, syntheticProfile } from "@/components/cycling/profile";

export const MARIN: Coordinate = [37.8991, -122.5253];
export const NAPA: Coordinate = [38.5025, -122.2654];
export const PENINSULA: Coordinate = [37.4419, -122.143];

/**
 * Closed loop with a few harmonics layered on, so fixture routes read as roads
 * rather than circles. Latitude is compressed by the cosine of the centre so
 * the loop keeps its proportions once projected.
 */
export function syntheticRoute(
  seed: string,
  center: Coordinate,
  radiusDegrees: number,
  points = 220,
): string {
  const random = seededRandom(seed);
  const harmonics = Array.from({ length: 4 }, (_, index) => ({
    frequency: index + 2,
    amplitude: (random() * 0.5 + 0.15) / (index + 1),
    phase: random() * Math.PI * 2,
  }));
  const lonScale = 1 / Math.cos((center[0] * Math.PI) / 180);

  return encodePolyline(
    Array.from({ length: points }, (_, index) => {
      const angle = (index / (points - 1)) * Math.PI * 2;
      const wobble = harmonics.reduce(
        (sum, h) => sum + h.amplitude * Math.sin(h.frequency * angle + h.phase),
        0,
      );
      const radius = radiusDegrees * (1 + wobble * 0.45);
      return [
        center[0] + radius * Math.sin(angle),
        center[1] + radius * Math.cos(angle) * lonScale,
      ] satisfies Coordinate;
    }),
  );
}

/** Years of rides, so the log pages back past `LOG_MONTHS` and `logCursor` moves. */
const SEED_MONTHS = 36;

/**
 * Months nobody rides in, left empty so a log page has to skip past them to
 * find the next month with rides in it.
 */
const OFF_SEASON = new Set([12, 1]);

/** Matches the samples `publishActivity` thins a real profile down to. */
const PROFILE_SAMPLES = 100;

const TIMEZONE = "America/Los_Angeles";

/** Local hour a ride starts, as the UTC hour Pacific daylight time puts it at. */
const START_HOUR_UTC = 14;

/** Ids ascend with time, the way Strava's do. */
const FIRST_ACTIVITY_ID = 15_000_000_000;

/**
 * What separates one kind of ride from another, in the SI units the hub sends.
 * The shapes exist to spread the feed across the cases a card has to draw:
 * a flat day beside a hilly one, a ride with a power meter beside one without,
 * a ride with a route beside one that reached the feed as a summary alone.
 */
interface Shape {
  names: string[];
  /** Metres, low to high. */
  distanceM: [number, number];
  /** Metres climbed per kilometre ridden. This is what sets a profile's relief. */
  climbPerKm: [number, number];
  /** Metres per second, which sets moving time. */
  speed: [number, number];
  /** Null for a ride that recorded no power at all. */
  watts: [number, number] | null;
  /**
   * How the watts were arrived at. Only `measured` reaches the records, so an
   * `estimated` ride carries an average the card is not allowed to print.
   */
  powerSource: "measured" | "estimated" | "none";
  photos: [number, number];
  center: Coordinate;
  radiusDegrees: number;
  /** A summary-only ride: no track, no profile, no name. */
  bare?: true;
}

const SHAPES: Shape[] = [
  {
    names: ["Friends of Tam", "Atlas", "Sierra to the Sea", "Pescadero"],
    distanceM: [140_000, 220_000],
    climbPerKm: [12, 17],
    speed: [6.2, 7.0],
    watts: [165, 200],
    powerSource: "measured",
    photos: [2, 5],
    center: NAPA,
    radiusDegrees: 0.19,
  },
  {
    names: ["Headlands", "Old La Honda repeats", "Mount Vision", "Camino Alto"],
    distanceM: [45_000, 78_000],
    climbPerKm: [14, 21],
    speed: [5.8, 6.6],
    watts: [185, 215],
    powerSource: "measured",
    photos: [0, 2],
    center: MARIN,
    radiusDegrees: 0.08,
  },
  // The flat day. Its total climbing is a fraction of the hilly rides above,
  // which is the difference an elevation profile has to draw.
  {
    names: ["Canada Road", "Alviso flats", "Bay Trail", "Coyote Creek"],
    distanceM: [50_000, 84_000],
    climbPerKm: [1.5, 3.5],
    speed: [7.4, 8.6],
    watts: [170, 195],
    powerSource: "estimated",
    photos: [0, 1],
    center: PENINSULA,
    radiusDegrees: 0.07,
  },
  {
    names: ["SFCC Race: TTT", "Golden Gate Crit", "Berkeley Hills Road Race"],
    distanceM: [15_000, 32_000],
    climbPerKm: [2, 6],
    speed: [9.4, 11.0],
    watts: [242, 284],
    powerSource: "measured",
    photos: [0, 1],
    center: PENINSULA,
    radiusDegrees: 0.03,
  },
  {
    names: ["Evening Ride", "Morning Ride", "Recovery spin"],
    distanceM: [20_000, 38_000],
    climbPerKm: [6, 11],
    speed: [6.0, 6.8],
    watts: null,
    powerSource: "none",
    photos: [0, 1],
    center: MARIN,
    radiusDegrees: 0.045,
  },
  // Reached the feed from a head unit summary: it happened and it took this
  // long, and nothing else. No route, no profile, no name.
  {
    names: [],
    distanceM: [12_000, 21_000],
    climbPerKm: [3, 8],
    speed: [6.0, 6.8],
    watts: null,
    powerSource: "none",
    photos: [0, 0],
    center: MARIN,
    radiusDegrees: 0,
    bare: true,
  },
];

/** `feed.ts`'s `COMMUTE_MAX_DISTANCE_M`: under this a ride is footnoted, not carded. */
const COMMUTE_M = 10_000;

/** Short enough that the feed footnotes these rather than carding them. */
const COMMUTE: Shape = {
  names: ["Commute"],
  distanceM: [4_200, 9_400],
  climbPerKm: [4, 9],
  speed: [5.2, 6.2],
  watts: null,
  powerSource: "none",
  photos: [0, 0],
  center: MARIN,
  radiusDegrees: 0,
  bare: true,
};

/**
 * The durations `feed.ts` reads a ladder at, with what the rider could hold for
 * each in the first season. A ride's own bests sit somewhere under these, so
 * the ladder describes a person rather than scaling off whatever the ride
 * happened to average: a twenty-minute race and a nine-hour day cannot both
 * have their hour power derived from their own average.
 */
const RIDER_BESTS = [
  { durationS: 60, watts: 428 },
  { durationS: 300, watts: 352 },
  { durationS: 1200, watts: 296 },
  { durationS: 3600, watts: 264 },
];

/** How near its ceiling a ride's best for a duration lands. */
const POWER_RANGE: [number, number] = [0.78, 1.0];

/**
 * A ride that logged more photos than a strip can show, so the row that wrapped
 * onto a second line is reproducible locally. Placed on the newest carded ride.
 */
const CROWDED_PHOTOS = 12;

export interface SeededRide {
  activity: PublishedActivity;
  /** Empty for a ride with no measured power. */
  bests: PowerBest[];
}

/**
 * Three years of rides ending in the month of `now`, deterministic for a given
 * month: the same command twice writes the same rows, so a re-seed is not a
 * different dataset to look at.
 */
export function seedRides(now: Date = new Date()): SeededRide[] {
  const rides: SeededRide[] = [];
  const firstYear = monthsBack(now, SEED_MONTHS - 1).getUTCFullYear();
  let shapeIndex = 0;

  for (let back = SEED_MONTHS - 1; back >= 0; back--) {
    const month = monthsBack(now, back);
    if (OFF_SEASON.has(month.getUTCMonth() + 1)) continue;

    // The month in progress runs only as far as yesterday. A feed carrying
    // rides that have not happened yet reads as a bug in the page.
    const days = back === 0 ? now.getUTCDate() - 1 : daysIn(month);
    if (days < 1) continue;

    const key = monthKey(month);
    const plan = seededRandom(`${key}-plan`);
    const rideCount = 3 + Math.floor(plan() * 3);
    const commuteCount = Math.floor(plan() * 7);
    // A season's form carries into the numbers, so the year picker in the
    // records view has something different to show for each year.
    const season = 1 + (month.getUTCFullYear() - firstYear) * 0.035;

    for (let n = 0; n < rideCount; n++) {
      const shape = SHAPES[shapeIndex++ % SHAPES.length]!;
      const day = spread(n, rideCount, days, plan);
      rides.push(build(shape, month, day, season, rides.length));
    }
    for (let n = 0; n < commuteCount; n++) {
      const day = spread(n, commuteCount, days, plan);
      rides.push(build(COMMUTE, month, day, season, rides.length));
    }
  }

  crowd(rides);
  return rides;
}

/** Gives the newest carded ride more photos than its strip has room for. */
function crowd(rides: SeededRide[]): void {
  const newest = rides.findLast(
    (ride) => (ride.activity.distanceM ?? 0) >= COMMUTE_M,
  );
  if (newest === undefined) return;
  newest.activity.photoKeys = photoKeys(
    newest.activity.activityId,
    CROWDED_PHOTOS,
  );
}

function build(
  shape: Shape,
  month: Date,
  day: number,
  season: number,
  index: number,
): SeededRide {
  const activityId = String(FIRST_ACTIVITY_ID + index * 1_237);
  const random = seededRandom(activityId);
  const distanceM = round(between(random, shape.distanceM) * season, 1);
  const elevationM = round(
    (distanceM / 1000) * between(random, shape.climbPerKm),
    1,
  );
  const movingS = Math.round(distanceM / between(random, shape.speed));
  const averageWatts =
    shape.watts === null ? null : round(between(random, shape.watts) * season);
  const name = shape.names[index % Math.max(1, shape.names.length)] ?? null;

  const activity: PublishedActivity = {
    activityId,
    // A ride that never reached Strava, so the card has no link to draw.
    stravaId: index % 11 === 0 ? null : activityId,
    name: shape.bare === true ? null : name,
    sport: "ride",
    startedAt: startedAt(month, day, random),
    timezone: TIMEZONE,
    distanceM,
    movingS,
    elevationM,
    averageWatts,
    powerSource: shape.powerSource,
    polyline:
      shape.bare === true
        ? null
        : syntheticRoute(activityId, shape.center, shape.radiusDegrees),
    elevationProfile:
      shape.bare === true
        ? null
        : altitudes(activityId, elevationM, between(random, [4, 180])),
    photoKeys: photoKeys(activityId, Math.round(between(random, shape.photos))),
  };

  return {
    activity,
    bests:
      shape.powerSource === "measured"
        ? powerBests(movingS, season, random)
        : [],
  };
}

/**
 * Metre altitudes whose summed ascent comes to `elevationM`, so the profile the
 * feed reads back agrees with the climbing the card prints beside it.
 */
function altitudes(seed: string, elevationM: number, baseM: number): number[] {
  const shape = syntheticProfile(seed, 1, PROFILE_SAMPLES);
  let ascent = 0;
  for (let index = 1; index < shape.length; index++) {
    ascent += Math.max(0, shape[index]! - shape[index - 1]!);
  }
  if (ascent === 0) return shape.map(() => round(baseM, 1));
  const scale = elevationM / ascent;
  return shape.map((point) => round(baseM + point * scale, 1));
}

/**
 * A ride's ladder, up to the durations it was long enough to hold. A shorter
 * ride names fewer, which is what leaves the em dash on the records view for a
 * duration nothing has measured yet.
 */
function powerBests(
  movingS: number,
  season: number,
  random: () => number,
): PowerBest[] {
  return RIDER_BESTS.filter((best) => best.durationS <= movingS).map(
    (best) => ({
      durationS: best.durationS,
      watts: round(best.watts * season * between(random, POWER_RANGE)),
    }),
  );
}

function photoKeys(activityId: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_unused, index) =>
      `raw/strava/activities/${activityId}/photos/${activityId}-${index}.png`,
  );
}

/** The instant a ride starting at breakfast Pacific time carries. */
function startedAt(month: Date, day: number, random: () => number): string {
  const minutes = Math.floor(random() * 150);
  return new Date(
    Date.UTC(
      month.getUTCFullYear(),
      month.getUTCMonth(),
      day,
      START_HOUR_UTC,
      minutes,
      Math.floor(random() * 60),
    ),
  ).toISOString();
}

/** Nth of `count` rides spread across a month, jittered off the even spacing. */
function spread(
  n: number,
  count: number,
  days: number,
  random: () => number,
): number {
  const even = ((n + 0.5) / count) * days;
  return Math.min(days, Math.max(1, Math.round(even + (random() - 0.5) * 3)));
}

function between(random: () => number, [low, high]: [number, number]): number {
  return low + random() * (high - low);
}

function round(value: number, places = 0): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function monthsBack(now: Date, months: number): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1),
  );
}

function monthKey(month: Date): string {
  return month.toISOString().slice(0, 7);
}

function daysIn(month: Date): number {
  return new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
}
