// The tiles on a ride's page, most useful first. A figure the ride has no data
// for is left out rather than shown as a dash, so a ride with no power meter
// reads as a shorter list rather than a row of blanks.
import type { RideDetail } from "@/activity/feed";
import type { Units } from "@/components/cycling/types";
import type { PartIcon } from "@/components/parts/icons";
import { climbUnit, distanceUnit, formatClimb, formatDistance } from "./format";

export interface RideStat {
  value: string;
  label: string;
  unit?: string;
  icon?: PartIcon;
}

type StatSource = Pick<
  RideDetail,
  | "distanceM"
  | "elevationM"
  | "movingS"
  | "averageWatts"
  | "normalizedWatts"
  | "averageHeartRate"
  | "temperatureLowC"
  | "temperatureHighC"
>;

export function rideStats(
  detail: StatSource,
  units: Units,
  hilly: boolean,
): RideStat[] {
  const stats: RideStat[] = [];
  if (detail.distanceM !== null) {
    stats.push({
      value: formatDistance(detail.distanceM, units),
      unit: distanceUnit(units),
      label: "distance",
    });
  }
  if (detail.elevationM !== null) {
    const climbing: RideStat = {
      value: formatClimb(detail.elevationM, units),
      unit: climbUnit(units),
      label: "climbing",
    };
    if (hilly) climbing.icon = "mountain";
    stats.push(climbing);
  }
  if (detail.movingS !== null && detail.movingS > 0) {
    stats.push({ value: formatDuration(detail.movingS), label: "moving time" });
  }
  if (detail.averageWatts !== null) {
    stats.push(watts(detail.averageWatts, "average power"));
  }
  if (detail.normalizedWatts !== null) {
    stats.push(watts(detail.normalizedWatts, "normalized power"));
  }
  if (detail.averageHeartRate !== null) {
    stats.push({
      value: String(Math.round(detail.averageHeartRate)),
      unit: "bpm",
      label: "average heart rate",
    });
  }
  if (detail.temperatureLowC !== null && detail.temperatureHighC !== null) {
    stats.push({
      value: formatTemperatureRange(
        detail.temperatureLowC,
        detail.temperatureHighC,
        units,
      ),
      unit: units === "metric" ? "°C" : "°F",
      label: "temperature",
    });
  }
  return stats;
}

function watts(value: number, label: string): RideStat {
  return { value: String(Math.round(value)), unit: "W", label };
}

/** Hours and minutes, `9:42`, the way a head unit shows elapsed time. */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** `58–74`, or the one figure when the ride held a single temperature. */
export function formatTemperatureRange(
  lowC: number,
  highC: number,
  units: Units,
): string {
  const low = Math.round(convert(lowC, units));
  const high = Math.round(convert(highC, units));
  return low === high ? String(low) : `${low}–${high}`;
}

function convert(celsius: number, units: Units): number {
  return units === "metric" ? celsius : (celsius * 9) / 5 + 32;
}
