import { about } from "./about";
import { activity, activityYear } from "./activity";
import { posts } from "./posts";
import type { Representation } from "./types";

export type { Representation } from "./types";

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
