// Which pages morph. An item page's surface carries a view transition name
// derived from its path, and a row linking to that path takes the same name
// for the one navigation it starts, so the row grows into the page and the
// page shrinks back into the row.
import { transitionName as codeTransitionName } from "@/code/view";
import { rideTransitionName } from "@/rides/links";
import { transitionName as postTransitionName } from "@/writing/rows";

/** The pages whose rows open an item: home and the routes with item pages. */
const LISTS = new Set(["/", "/rides", "/code", "/writing"]);

const RIDE = /^\/rides\/([A-Za-z0-9_-]{1,64})$/;
const REPO = /^\/code\/([^/]+)\/([^/]+)$/;
const PROJECT = /^\/code\/([^/]+)$/;
const POST = /^\/writing\/[^.]+$/;

function trimmed(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function isList(pathname: string): boolean {
  return LISTS.has(trimmed(pathname));
}

/** The name an item page's surface carries, or null for a page that isn't one. */
export function itemTransitionName(pathname: string): string | null {
  const path = trimmed(pathname);
  const ride = RIDE.exec(path);
  if (ride) return rideTransitionName(ride[1]!);
  const repo = REPO.exec(path);
  if (repo)
    return codeTransitionName(`${decoded(repo[1]!)}/${decoded(repo[2]!)}`);
  const project = PROJECT.exec(path);
  if (project) return codeTransitionName(decoded(project[1]!));
  if (POST.test(path)) return postTransitionName(path);
  return null;
}
