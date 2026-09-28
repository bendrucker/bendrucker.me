// The Rides route's story data, in the tuple shapes its props carry. The names,
// figures, and descriptions follow the boards. The tracks are the cycling
// fixtures' own.
import {
  epicRide,
  everydayRide,
  raceRide,
  travelRide,
} from "@/components/cycling/fixtures";
import { isBig, rankHighlights, rankRecords, type Records } from "@/rides/rank";
import {
  byMonth,
  toRouteTuple,
  toTuple,
  type RideMonth,
  type RideRow,
  type RideTuple,
  type RouteTuple,
} from "@/rides/rows";
import { routeTilePath } from "@/rides/tile";

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

const ranked = rankRecords(allRows);

export const records: Records<RideTuple> = {
  longest: ranked.longest.map((ride) => toTuple(ride)),
  climbing: ranked.climbing.map((ride) => toTuple(ride)),
};

const tracks = [epicRide, everydayRide, raceRide, travelRide];

/** Six big rides as tiles, cycling through the fixture tracks. */
export const routes: RouteTuple[] = allRows
  .filter((ride) => isBig(ride))
  .slice(0, 6)
  .flatMap((ride, index) => {
    const encoded = tracks[index % tracks.length]?.route;
    const path = encoded === undefined ? null : routeTilePath(encoded);
    return path === null ? [] : [toRouteTuple({ ...ride, path })];
  });
