// The Rides route's rows, in the compact shape its island props and its JSON
// pages carry. A row is a tuple rather than an object so four thousand of them
// cost a fraction of what named keys would, and the browser parses every page
// through the schemas here rather than asserting what `response.json()` gave it.
// They are written against `zod/mini`, which tree-shakes to the few checks they
// use where the full build would add twenty kilobytes to the island.
import * as z from "zod/mini";

/**
 * One ride as a list shows it. Distances are whole metres, and null where the
 * ride never recorded one, which a row leaves out rather than calling zero.
 */
export interface RideRow {
  id: string;
  name: string;
  /** The local calendar day the ride started on, `YYYY-MM-DD`. */
  day: string;
  distanceM: number | null;
  climbM: number | null;
  /** What the rider wrote on the activity, when there is something. */
  description?: string;
}

/**
 * A row on the wire: `[id, name, day, distanceM, climbM, description?]`. Most
 * rides carry no description, and theirs stops at the climb.
 */
export type RideTuple = [
  string,
  string,
  string,
  number | null,
  number | null,
  string?,
];

/** A tile on the Routes view: a row plus its track drawn as an SVG path. */
export type RouteTuple = [
  string,
  string,
  string,
  number | null,
  number | null,
  string,
];

export interface RouteTile extends RideRow {
  /** The simplified track in a `TILE_SIZE` square, as SVG path data. */
  path: string;
}

/** A month of the log, newest ride first. */
export interface RideMonth {
  /** `YYYY-MM`. */
  key: string;
  rides: RideTuple[];
}

/** One page of the log, and the month the page after it loads before. */
export interface RideRowsPage {
  months: RideMonth[];
  logCursor: string | null;
}

export const rideTuple = z.tuple([
  z.string(),
  z.string(),
  z.string(),
  z.nullable(z.number()),
  z.nullable(z.number()),
  z.optional(z.string()),
]) satisfies z.ZodMiniType<RideTuple>;

export const rideRowsPage = z.object({
  months: z.array(z.object({ key: z.string(), rides: z.array(rideTuple) })),
  logCursor: z.nullable(z.string()),
}) satisfies z.ZodMiniType<RideRowsPage>;

/** Every ride, newest first: what search reads once the reader starts one. */
export const rideIndex = z.object({
  rides: z.array(rideTuple),
});

export type RideIndex = z.infer<typeof rideIndex>;

export function toTuple(row: RideRow): RideTuple {
  const { id, name, day, distanceM, climbM, description } = row;
  return description === undefined
    ? [id, name, day, distanceM, climbM]
    : [id, name, day, distanceM, climbM, description];
}

export function fromTuple([
  id,
  name,
  day,
  distanceM,
  climbM,
  description,
]: RideTuple): RideRow {
  const row: RideRow = { id, name, day, distanceM, climbM };
  if (description !== undefined) row.description = description;
  return row;
}

/** A tile shows only the name, so it leaves the description behind. */
export function toRouteTuple(tile: RouteTile): RouteTuple {
  return [tile.id, tile.name, tile.day, tile.distanceM, tile.climbM, tile.path];
}

export function fromRouteTuple([
  id,
  name,
  day,
  distanceM,
  climbM,
  path,
]: RouteTuple): RouteTile {
  return { id, name, day, distanceM, climbM, path };
}

/** Groups rows that arrive newest first into their months. */
export function byMonth(rows: readonly RideRow[]): RideMonth[] {
  const months: RideMonth[] = [];
  for (const row of rows) {
    const key = row.day.slice(0, 7);
    const month = months.at(-1);
    if (month?.key === key) month.rides.push(toTuple(row));
    else months.push({ key, rides: [toTuple(row)] });
  }
  return months;
}
