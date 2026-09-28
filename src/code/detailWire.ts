// A repository or a project as its page and the Code list's modal both show
// it: the header, the stat tiles, a project's repositories, and the work
// opened there. `detail.ts` builds it on the server. This half is what the
// browser needs: the keys a row's link and the URL carry, and the schema the
// modal parses its fetch through. It imports nothing that reads the database.
import * as z from "zod/mini";
import { PART_ICONS, type PartIcon } from "@/components/parts/icons";
import { decodedSegment } from "@/detail/url";
import type { WorkState } from "./page";

/** The query parameter the Code list names an open item under. */
export const CODE_PARAM = "item";

/**
 * An owner, a repository, or a project id. GitHub allows only these in a
 * name, and a key is refused before it reaches a query.
 */
const SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;

const PROJECT_PATH = /^\/code\/([^/]+)\/?$/;
const REPO_PATH = /^\/code\/([^/]+)\/([^/]+)\/?$/;

export type CodeKey =
  | { kind: "repo"; owner: string; name: string }
  | { kind: "project"; id: string };

/** A key read from the URL: `owner/name` for a repository, an id for a project. */
export function parseCodeKey(key: string): CodeKey | null {
  const segments = key.split("/");
  if (!segments.every((segment) => SEGMENT.test(segment))) return null;
  const [first, second] = segments;
  if (segments.length === 1 && first !== undefined) {
    return { kind: "project", id: first };
  }
  if (segments.length === 2 && first !== undefined && second !== undefined) {
    return { kind: "repo", owner: first, name: second };
  }
  return null;
}

function pathSegments(pathname: string): string[] {
  const repo = REPO_PATH.exec(pathname);
  if (repo) return [repo[1]!, repo[2]!];
  const project = PROJECT_PATH.exec(pathname);
  return project ? [project[1]!] : [];
}

/** The item a path is the page of, as the key its row carries, or null. */
export function codeKey(pathname: string): string | null {
  const segments = pathSegments(pathname);
  if (segments.length === 0) return null;
  const key = segments.map((segment) => decodedSegment(segment)).join("/");
  return parseCodeKey(key) === null ? null : key;
}

/** An item's own page. */
export function codePageHref(key: string): string {
  return `${codePath(key)}/`;
}

/** Where the modal fetches an item from. */
export function codeDetailUrl(key: string): string {
  return `${codePath(key)}.json`;
}

function codePath(key: string): string {
  const segments = key.split("/").map((segment) => encodeURIComponent(segment));
  return `/code/${segments.join("/")}`;
}

const WORK_STATES = [
  "MERGED",
  "OPEN",
  "DRAFT",
  "CLOSED",
  "ISSUE_OPEN",
  "ISSUE_DONE",
  "ISSUE_NOT_PLANNED",
] as const satisfies readonly WorkState[];

const partIcon = z.custom<PartIcon>(
  (value) => typeof value === "string" && Object.hasOwn(PART_ICONS, value),
);

export const codeDetail = z.object({
  /** The row this item grows out of: `owner/name`, or a project's id. */
  key: z.string(),
  title: z.string(),
  /** The owner above the title, when it isn't the site's own. */
  org: z.optional(z.string()),
  dek: z.optional(z.string()),
  /** A repository leads with its language's diamond, a project with it in a ring. */
  mark: z.enum(["dot", "ring"]),
  dot: z.string(),
  /** The page on GitHub, where there is one to open. */
  githubUrl: z.optional(z.string()),
  tiles: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      icon: z.optional(partIcon),
    }),
  ),
  /** A project's repositories, strongest first. Empty for a repository. */
  members: z.array(
    z.object({
      href: z.string(),
      title: z.string(),
      text: z.optional(z.string()),
      dot: z.string(),
    }),
  ),
  work: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
      state: z.enum(WORK_STATES),
      repo: z.optional(z.string()),
    }),
  ),
  /** GitHub's search for the rest, once the work list stops short. */
  moreHref: z.optional(z.string()),
  /** The page's meta description. */
  description: z.string(),
});

export type CodeDetail = z.infer<typeof codeDetail>;

export async function fetchCodeDetail(key: string): Promise<CodeDetail> {
  const response = await fetch(codeDetailUrl(key));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return codeDetail.parse(await response.json());
}
