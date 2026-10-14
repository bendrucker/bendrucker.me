/**
 * The Lucide icons the parts draw from data. Each class is written out because
 * Tailwind extracts candidates from source text and never sees an interpolated
 * one.
 */
export const PART_ICONS = {
  "arrow-down-up": "icon-[lucide--arrow-down-up]",
  book: "icon-[lucide--book]",
  calendar: "icon-[lucide--calendar]",
  "circle-dot": "icon-[lucide--circle-dot]",
  film: "icon-[lucide--film]",
  "folder-git-2": "icon-[lucide--folder-git-2]",
  "git-pull-request": "icon-[lucide--git-pull-request]",
  headphones: "icon-[lucide--headphones]",
  list: "icon-[lucide--list]",
  map: "icon-[lucide--map]",
  mountain: "icon-[lucide--mountain]",
  newspaper: "icon-[lucide--newspaper]",
  podcast: "icon-[lucide--podcast]",
  ruler: "icon-[lucide--ruler]",
  star: "icon-[lucide--star]",
  tag: "icon-[lucide--tag]",
  trophy: "icon-[lucide--trophy]",
  tv: "icon-[lucide--tv]",
} as const;

export type PartIcon = keyof typeof PART_ICONS;

/** The type a media row carries, for the icon its lead shows. */
export const KIND_ICONS: Record<string, PartIcon> = {
  Book: "book",
  Article: "newspaper",
  Movie: "film",
  Podcast: "podcast",
  Show: "tv",
  Album: "headphones",
};
