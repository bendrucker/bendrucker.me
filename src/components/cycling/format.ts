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

export function monthKeyOf(startedAt: string): string {
  return startedAt.slice(0, 7);
}
