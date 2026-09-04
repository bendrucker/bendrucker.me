import type { MonthStats } from "@/activity/types";
import type { Units } from "./types";

const KM_PER_MILE = 1.609344;
const METERS_PER_FOOT = 0.3048;

export function distanceUnit(units: Units): string {
  return units === "imperial" ? "mi" : "km";
}

export function elevationUnit(units: Units): string {
  return units === "imperial" ? "ft" : "m";
}

export function speedUnit(units: Units): string {
  return units === "imperial" ? "mph" : "km/h";
}

export function formatDistance(miles: number, units: Units): string {
  const value = units === "imperial" ? miles : miles * KM_PER_MILE;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatElevation(feet: number, units: Units): string {
  const value = units === "imperial" ? feet : feet * METERS_PER_FOOT;
  return Math.round(value).toLocaleString("en-US");
}

export function formatSpeed(mph: number, units: Units): string {
  const value = units === "imperial" ? mph : mph * KM_PER_MILE;
  return value.toFixed(1);
}

/**
 * The stat line beside a month heading. Shared so the log and the highlights
 * cannot disagree about a month the reader toggles between.
 */
export function formatMonthSummary(month: MonthStats, units: Units): string {
  return [
    `${formatDistance(month.distanceMi, units)} ${distanceUnit(units)}`,
    `${formatElevation(month.elevationFt, units)} ${elevationUnit(units)}`,
    `${month.rideCount} rides`,
  ].join(" · ");
}

/** Coarse ride length: `4:32` past an hour, `48 min` below it. */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (!hours) return `${minutes} min`;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

/** Exact elapsed time for efforts and races, where seconds decide placings. */
export function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  const paddedSeconds = String(secs).padStart(2, "0");
  if (!hours) return `${minutes}:${paddedSeconds}`;
  return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
}

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** `2026-08` to `august 2026`. */
export function formatMonthKey(key: string): string {
  const month = MONTH_NAMES[Number(key.slice(5, 7)) - 1];
  return `${month} ${key.slice(0, 4)}`;
}

/** `2026-08` to `aug`, the width the rail and the badges have room for. */
export function formatMonthShort(key: string): string {
  return MONTH_NAMES[Number(key.slice(5, 7)) - 1]?.slice(0, 3) ?? "";
}

export function monthKeyOf(startedAt: string): string {
  return startedAt.slice(0, 7);
}

/** `2026-08` to `2026-09`, rolling the year over past december. */
export function monthAfter(key: string): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return monthKey(year, month);
}

/** `2026-08` back `count` months, so `monthsBefore("2026-01", 2)` is `2025-11`. */
export function monthsBefore(key: string, count: number): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return monthKey(year, month - 1 - count);
}

// Months outside 1..12 roll the year, which is what `Date.UTC` does with an
// out-of-range month index.
function monthKey(year: number, monthIndex: number): string {
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 7);
}

const METERS_PER_MILE = KM_PER_MILE * 1000;

/** The feed stores SI. The view carries the imperial values these produce. */
export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function metersToFeet(meters: number): number {
  return meters / METERS_PER_FOOT;
}
