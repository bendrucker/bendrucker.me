import {
  computed,
  inject,
  provide,
  ref,
  type InjectionKey,
  type Ref,
} from "vue";
import * as format from "./format";
import type { CommuteSummary, MonthStats } from "@/activity/types";
import type { Units } from "./types";

const unitsKey: InjectionKey<Ref<Units>> = Symbol("cycling-units");

export function provideUnits(units: Ref<Units>): void {
  provide(unitsKey, units);
}

/**
 * Reads the unit preference the root view provides. Falls back to a standalone
 * imperial ref so any component still renders when mounted on its own, which is
 * how every story below the root mounts it.
 */
export function useUnits() {
  const units = inject(unitsKey, () => ref<Units>("imperial"), true);

  return {
    units,
    distanceUnit: computed(() => format.distanceUnit(units.value)),
    elevationUnit: computed(() => format.elevationUnit(units.value)),
    speedUnit: computed(() => format.speedUnit(units.value)),
    formatDistance: (miles: number) =>
      format.formatDistance(miles, units.value),
    formatElevation: (feet: number) =>
      format.formatElevation(feet, units.value),
    formatSpeed: (mph: number) => format.formatSpeed(mph, units.value),
    formatMonthSummary: (month: MonthStats) =>
      format.formatMonthSummary(month, units.value),
    formatCommuteTotals: (commutes: CommuteSummary) =>
      format.formatCommuteTotals(commutes, units.value),
    formatDuration: format.formatDuration,
    formatClock: format.formatClock,
  };
}
