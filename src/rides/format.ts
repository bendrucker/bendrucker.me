// How a ride's figures and dates read on the Rides route and a ride's page.
import { monthShort } from "@/activity/sections";
import type { Units } from "@/components/cycling/types";

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 1 / 0.3048;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const UNITS = ["imperial", "metric"] as const satisfies readonly Units[];

/** Reads `?units=`, which defaults to miles. */
export function parseUnits(value: string | null | undefined): Units {
  return value === "metric" ? "metric" : "imperial";
}

export function distanceUnit(units: Units): "mi" | "km" {
  return units === "metric" ? "km" : "mi";
}

export function climbUnit(units: Units): "ft" | "m" {
  return units === "metric" ? "m" : "ft";
}

/**
 * Miles or kilometres, grouped: `1,204`. Whole numbers, except under one,
 * which takes a tenth so a short spin doesn't read as `0`.
 */
export function formatDistance(meters: number, units: Units): string {
  const value = units === "metric" ? meters / 1000 : meters / METERS_PER_MILE;
  if (value > 0 && value < 0.95) return value.toFixed(1);
  return Math.round(value).toLocaleString("en-US");
}

/** Whole feet or metres, grouped: `18,100`. */
export function formatClimb(meters: number, units: Units): string {
  const value = units === "metric" ? meters : meters * FEET_PER_METER;
  return Math.round(value).toLocaleString("en-US");
}

/** A row's figure, `139 mi`, or undefined when the ride's distance is unknown. */
export function distanceFigure(
  meters: number | null,
  units: Units,
): string | undefined {
  if (meters === null) return undefined;
  return `${formatDistance(meters, units)} ${distanceUnit(units)}`;
}

/** A climbing record's figure, `18,100 ft`, or undefined when the climb is unknown. */
export function climbFigure(
  meters: number | null,
  units: Units,
): string | undefined {
  if (meters === null) return undefined;
  return `${formatClimb(meters, units)} ${climbUnit(units)}`;
}

/** An item page's date: `Saturday, July 11`, with the year once it isn't this one. */
export function fullDate(day: string, thisYear: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = WEEKDAYS[date.getUTCDay()] ?? "";
  const month = MONTHS[Number(day.slice(5, 7)) - 1] ?? "";
  const year = day.slice(0, 4);
  const base = `${weekday}, ${month} ${Number(day.slice(8, 10))}`;
  return year === thisYear ? base : `${base}, ${year}`;
}

/**
 * What the gutter prints under the day where the section isn't a month: the
 * month for a ride this year, the year for one before it.
 */
export function gutterSub(day: string, thisYear: string): string {
  const year = day.slice(0, 4);
  return year === thisYear ? monthShort(day) : year;
}
