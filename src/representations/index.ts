import { about } from "./about";
import { activity, activityYear } from "./activity";
import { posts } from "./posts";
import type { Representation, RepresentationEntry } from "./types";

export type { Representation, RepresentationEntry } from "./types";
export { markdownEndpoint, MARKDOWN_CONTENT_TYPE } from "./endpoint";
export { about, activity, activityYear, posts };

const REPRESENTATIONS: readonly Representation[] = [
  about,
  posts,
  activity,
  activityYear,
];

const byRoute = new Map(
  REPRESENTATIONS.map((representation) => [
    representation.route,
    representation,
  ]),
);

export function representationFor(
  routePattern: string,
): Representation | undefined {
  return byRoute.get(routePattern);
}

export interface RepresentationSection {
  title: string;
  entries: RepresentationEntry[];
}

/** Every markdown document on the site, grouped for `/llms.txt`. */
export async function listRepresentations(): Promise<RepresentationSection[]> {
  const sections: RepresentationSection[] = [];

  for (const representation of REPRESENTATIONS) {
    const entries = await representation.list();
    if (entries.length === 0) continue;

    const section = sections.find((s) => s.title === representation.section);
    if (section) {
      section.entries.push(...entries);
    } else {
      sections.push({ title: representation.section, entries });
    }
  }

  return sections;
}
