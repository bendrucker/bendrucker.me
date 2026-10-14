// The Rides route's story data, in the tuple shapes its props carry. The names,
// figures, and descriptions follow the boards.
import { rankHighlights } from "@/rides/rank";
import {
  LADDER_DURATIONS,
  pickRecords,
  rankPeriods,
  type ClimbEffort,
  type PeriodRecords,
  type PowerPoint,
  type RecordRow,
  type RecordsPage,
} from "@/rides/records";
import type { Ride } from "@/activity/types";
import {
  epicRide,
  everydayRide,
  travelRide,
} from "@/components/cycling/fixtures";
import type { RideDetailWire } from "@/rides/detail";
import {
  byMonth,
  toTuple,
  type RideMonth,
  type RideRow,
  type RideTuple,
} from "@/rides/rows";

export const THIS_YEAR = "2026";

const row = (
  id: string,
  name: string,
  day: string,
  miles: number,
  feet: number,
  description?: string,
): RideRow => ({
  id,
  name,
  day,
  distanceM: Math.round(miles * 1609.344),
  climbM: Math.round(feet * 0.3048),
  ...(description === undefined ? {} : { description }),
});

/** September and August, newest first, as the log opens on. */
export const logRows: RideRow[] = [
  row("s23", "Boot Camp", "2026-09-23", 15, 1_500),
  row("s22", "Headlands", "2026-09-22", 23, 2_300),
  row("s20", "Richfield", "2026-09-20", 10, 300),
  row(
    "s19",
    "Stinson EP Alpine",
    "2026-09-19",
    67,
    6_700,
    "In the fog, above the fog",
  ),
  row("s18", "Coffee ride", "2026-09-18", 12, 200),
  row("s17a", "Afternoon Ride", "2026-09-17", 3, 400),
  row("s17b", "Cinderella", "2026-09-17", 17, 500),
  row("s16", "Morning Ride", "2026-09-16", 4, 100),
  row("s14", "Boot Camp", "2026-09-14", 15, 1_500),
  row("a29", "Tres", "2026-08-29", 186, 17_060),
  row("a15", "SFCC Friends of Tam", "2026-08-15", 119, 15_282),
  row("a08", "Red Whale Olema", "2026-08-08", 87, 5_200),
  row("a02", "Paradise Loop", "2026-08-02", 24, 1_100),
];

/** Older rides, from years the section labels have to name. */
export const olderRows: RideRow[] = [
  row("j11", "Friends of Tam", "2026-07-11", 139, 18_100, "MV FF BF SB RRG"),
  row("j03", "Atlas", "2026-07-03", 196, 12_400),
  row("o19", "Mt. Diablo", "2025-10-19", 72, 7_800),
  row("m18", "Levi's GranFondo", "2024-10-05", 103, 8_600),
];

export const allRows: RideRow[] = [...logRows, ...olderRows];

export const months: RideMonth[] = byMonth(logRows);

export const highlights: RideTuple[] = rankHighlights(allRows).map((ride) =>
  toTuple(ride),
);

/** Rides from before this year, so the records have years to pick between. */
const earlierRecordRows: RideRow[] = [
  row("r25a", "Sierra to the Sea", "2025-06-14", 142, 12_480),
  row("r25b", "Hamilton Loop", "2025-04-26", 89, 8_940),
  row("r25c", "Point Reyes", "2025-03-08", 74, 4_100),
  row("r25d", "Old La Honda", "2025-01-18", 41, 3_900),
  row("r24a", "Death Ride", "2024-07-13", 129, 15_000),
  row("r24b", "Marin Century", "2024-08-03", 101, 9_200),
];

/** The power meter arrived in 2025, which leaves 2024's power list empty. */
function metered(day: string): boolean {
  return day >= "2025";
}

interface MeteredRow extends RecordRow {
  movingS: number;
  watts: number | null;
}

const recordRows: MeteredRow[] = [...allRows, ...earlierRecordRows]
  .filter((ride) => ride.distanceM !== null && ride.distanceM > 0)
  .map((ride, index) => ({
    id: ride.id,
    name: ride.name,
    day: ride.day,
    distanceM: ride.distanceM ?? 0,
    climbM: ride.climbM,
    // About fourteen miles an hour, slower where it climbs.
    movingS: Math.round((ride.distanceM ?? 0) / 6.2 + (ride.climbM ?? 0) * 1.1),
    watts: metered(ride.day) ? 165 + ((index * 17) % 60) : null,
  }));

// A best over a longer duration is always lower, as a real curve is.
const LADDER_SHARE = new Map([
  [5, 4.6],
  [60, 2.3],
  [300, 1.55],
  [1200, 1.28],
  [3600, 1.12],
]);

const powerPoints: PowerPoint[] = recordRows.flatMap((ride, index) =>
  ride.watts === null
    ? []
    : LADDER_DURATIONS.filter(
        // A short ride never holds an hour, so it has no point there.
        (durationS) => ride.movingS >= durationS,
      ).map((durationS) => ({
        id: ride.id,
        name: ride.name,
        day: ride.day,
        durationS,
        watts: Math.round(
          (ride.watts ?? 0) * (LADDER_SHARE.get(durationS) ?? 1) +
            ((index * 11) % 23),
        ),
      })),
);

// Names repeat so the list shows a climb ridden twice placing once, and some
// are null for a summit OpenStreetMap had nothing near.
const CLIMB_NAMES = ["Mount Diablo", "Mount Hamilton", null, "Old La Honda"];

const climbEfforts: ClimbEffort[] = recordRows
  .filter((ride) => (ride.climbM ?? 0) >= 450)
  .map((ride, index) => ({
    id: ride.id,
    position: 0,
    climb: CLIMB_NAMES[index % CLIMB_NAMES.length] ?? null,
    ride: ride.name,
    day: ride.day,
    gainM: Math.round((ride.climbM ?? 0) * 0.7),
  }));

export const recordPeriods: PeriodRecords[] = rankPeriods(
  recordRows,
  powerPoints,
  climbEfforts,
);

/** What the page renders for a period, as the route would answer for it. */
export function recordsPageFor(period: string): RecordsPage {
  const page = pickRecords(recordPeriods, period);
  if (page === null) throw new Error(`No records for ${period}`);
  return page;
}

function metres(miles?: number): number | null {
  return miles === undefined ? null : Math.round(miles * 1609.344);
}

/**
 * A card fixture as a ride's page and modal take it. The cards carry imperial
 * figures and the detail metric ones, so they're converted back.
 */
function detailOf(
  ride: Ride,
  extra: Partial<RideDetailWire> = {},
): RideDetailWire {
  return {
    id: ride.id,
    name: ride.name,
    startedAt: ride.startedAt,
    ...(ride.stravaUrl === undefined ? {} : { stravaUrl: ride.stravaUrl }),
    ...(ride.route === undefined ? {} : { route: ride.route }),
    description: null,
    distanceM: metres(ride.distanceMi),
    elevationM:
      ride.elevationFt === undefined
        ? null
        : Math.round(ride.elevationFt * 0.3048),
    movingS: ride.movingSeconds ?? null,
    averageWatts: ride.averageWatts ?? null,
    normalizedWatts: null,
    averageHeartRate: null,
    temperatureLowC: null,
    temperatureHighC: null,
    media: ride.media,
    ...extra,
  };
}

/** A big day with everything: a map, every figure, and shots. */
export const epicDetail = detailOf(epicRide, {
  description: "MV FF BF SB RRG",
  normalizedWatts: 211,
  averageHeartRate: 142,
  temperatureLowC: 12,
  temperatureHighC: 29,
});

/** A ride with a map and figures, and no shots. */
export const everydayDetail = detailOf(everydayRide, { media: [] });

/** A ride with a video first. */
export const travelDetail = detailOf(travelRide);

/** A head unit's summary alone: no map, no power, no shots. */
export const bareDetail: RideDetailWire = detailOf(
  { ...everydayRide, route: undefined, stravaUrl: undefined, media: [] },
  { id: "bare", name: "Trainer", averageWatts: null, elevationM: null },
);
