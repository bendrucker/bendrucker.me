// State the cycling views hold for themselves. What they render arrives from
// `@/activity/types`, which the feed query and the story fixtures both fill.
export type Units = "imperial" | "metric";

export type ViewMode = "log" | "highlights" | "prs";

/** One segment of a `SegmentedControl`. */
export interface SegmentedOption {
  value: string;
  label: string;
  /**
   * Spoken instead of `label` where the visible text is an abbreviation the
   * design shortens for width: "mi", "prs".
   */
  name?: string;
}
