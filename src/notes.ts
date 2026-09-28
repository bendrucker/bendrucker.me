import { getEntry } from "astro:content";
import type { CategoryId } from "@/categories";

export interface RouteNote {
  /** The line a reader sees without opening the note. */
  lede: string;
  /** The rest, rendered from the note's Markdown body. */
  html?: string;
}

/** The category's note, when `src/content/notes` has one. */
export async function routeNote(
  id: CategoryId,
): Promise<RouteNote | undefined> {
  const entry = await getEntry("notes", id);
  if (entry === undefined) return undefined;
  const html = entry.rendered?.html.trim();
  return html ? { lede: entry.data.lede, html } : { lede: entry.data.lede };
}
