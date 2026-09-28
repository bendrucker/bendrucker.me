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

/** A whole number of miles or kilometres, grouped: `1,204`. */
export function formatDistance(meters: number, units: Units): string {
  const value = units === "metric" ? meters / 1000 : meters / METERS_PER_MILE;
  return Math.round(value).toLocaleString("en-US");
}

/** Whole feet or metres, grouped: `18,100`. */
export function formatClimb(meters: number, units: Units): string {
  const value = units === "metric" ? meters : meters * FEET_PER_METER;
  return Math.round(value).toLocaleString("en-US");
}

/** A row's figure: `139 mi`. */
export function distanceFigure(meters: number, units: Units): string {
  return `${formatDistance(meters, units)} ${distanceUnit(units)}`;
}

/** A climbing record's figure: `18,100 ft`. */
export function climbFigure(meters: number, units: Units): string {
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
