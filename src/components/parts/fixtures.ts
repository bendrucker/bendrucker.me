import { CATEGORIES, type Category } from "@/categories";
import type { StoryControl } from "@/stories/controls";

/** Every part is drawn in a category's color, so each story can switch between them. */
export const categoryControl: StoryControl = {
  type: "select",
  title: "category",
  options: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name])),
};

export function storyCategory(id: unknown): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]!;
}

/**
 * Stand-ins for the posters and sleeves the media routes draw, generated so the
 * story book carries no artwork that isn't ours.
 */
function art(width: number, height: number, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width / 2}" cy="${height * 0.42}" r="${width * 0.22}" fill="#fff" fill-opacity=".55"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const POSTER = art(60, 90, "#1c3a5e", "#7aa7c7");
export const ALBUM = art(76, 76, "#3b2a1a", "#d9a441");
export const PODCAST = art(76, 76, "#0f3d2e", "#5fd3a2");
