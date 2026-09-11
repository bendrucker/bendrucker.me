/**
 * The numbers on the homepage's stat bands, formatted the same on the
 * server and in the script that animates a window change. Distances and
 * counts take commas. Climbing runs to millions of feet over a career, so
 * it compacts once it passes six digits, where a full number stops being
 * readable at a glance. A number the data cannot give is a dash.
 */
export type StatKind = "distance" | "elevation" | "count";

export const NO_STAT = "—";

export function formatStat(value: number | null, kind: StatKind): string {
  if (value === null) return NO_STAT;
  if (kind === "elevation" && value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (kind === "elevation" && value >= 100_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return Math.round(value).toLocaleString("en-US");
}
