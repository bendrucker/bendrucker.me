// What a repository's or a project's page shows beneath its title: the stat
// tiles, then the pull requests and issues opened there, newest first.
import { SITE } from "@/config";
import type { PartIcon } from "@/components/parts/icons";
import { ORG_TITLES, PROJECTS } from "./rank";
import type {
  CodeRepo,
  CodeStats,
  IssueRow,
  ProjectStats,
  PullRow,
  RepoStats,
} from "./types";

/** Past this many, a quiet "More" links to GitHub for the rest. */
export const WORK_SHOWN = 8;

export type WorkState =
  | "MERGED"
  | "OPEN"
  | "DRAFT"
  | "CLOSED"
  | "ISSUE_OPEN"
  | "ISSUE_DONE"
  | "ISSUE_NOT_PLANNED";

export interface WorkItem {
  id: string;
  title: string;
  url: string;
  state: WorkState;
  /** The repository's name, on a project's page where work spans several. */
  repo?: string;
}

/** What a screen reader hears in place of the state's icon. */
export const WORK_STATE_NAMES: Record<WorkState, string> = {
  MERGED: "Merged pull request",
  OPEN: "Open pull request",
  DRAFT: "Draft pull request",
  CLOSED: "Closed pull request",
  ISSUE_OPEN: "Open issue",
  ISSUE_DONE: "Closed issue",
  ISSUE_NOT_PLANNED: "Issue closed as not planned",
};

function pullState(pull: PullRow): WorkState {
  if (pull.state === "OPEN" && pull.isDraft) return "DRAFT";
  return pull.state;
}

function issueState(issue: IssueRow): WorkState {
  if (issue.state === "OPEN") return "ISSUE_OPEN";
  return issue.stateReason === "NOT_PLANNED"
    ? "ISSUE_NOT_PLANNED"
    : "ISSUE_DONE";
}

export interface WorkList {
  items: WorkItem[];
  more: boolean;
}

/** A repository's work, or a project's across its members when `withRepo` is set. */
export function workList(
  repos: readonly Pick<CodeRepo, "name" | "pulls" | "issues">[],
  { withRepo = false, shown = WORK_SHOWN } = {},
): WorkList {
  const all = repos
    .flatMap((repo) => {
      const from = withRepo ? { repo: repo.name } : {};
      return [
        ...repo.pulls.map((pull) => ({
          at: pull.createdAt,
          item: {
            id: pull.id,
            title: pull.title,
            url: pull.url,
            state: pullState(pull),
            ...from,
          },
        })),
        ...repo.issues.map((issue) => ({
          at: issue.createdAt,
          item: {
            id: issue.id,
            title: issue.title,
            url: issue.url,
            state: issueState(issue),
            ...from,
          },
        })),
      ];
    })
    .toSorted((a, b) => b.at.localeCompare(a.at));

  return {
    items: all.slice(0, shown).map(({ item }) => item),
    more: all.length > shown,
  };
}

/** GitHub's search for everything the site's owner opened in some repositories. */
export function moreUrl(
  scope: { org: string } | { repos: readonly string[] },
  author: string = SITE.githubUsername,
): string {
  const where =
    "org" in scope
      ? [`org:${scope.org}`]
      : scope.repos.map((repo) => `repo:${repo}`);
  const q = [...where, `author:${author}`].join(" ");
  return `https://github.com/search?${new URLSearchParams({ type: "issues", q })}`;
}

export interface StatTileData {
  value: string;
  label: string;
  icon?: PartIcon;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "Aug 2026", from an ISO timestamp, by the UTC calendar GitHub stamps it in. */
export function monthYear(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1] ?? ""} ${iso.slice(0, 4)}`;
}

const count = (n: number) => n.toLocaleString("en-US");

function since(iso: string | null): StatTileData[] {
  return iso ? [{ value: monthYear(iso), label: "since" }] : [];
}

/** A count that is only a floor reads as one. */
const atLeast = (n: number, capped: boolean) =>
  capped ? `${count(n)}+` : count(n);

function issues({ issues: n, issuesCapped }: CodeStats): StatTileData[] {
  return n > 0
    ? [{ icon: "circle-dot", value: atLeast(n, issuesCapped), label: "issues" }]
    : [];
}

function pulls({ prs, prsCapped }: CodeStats): StatTileData[] {
  return prs > 0
    ? [
        {
          icon: "git-pull-request",
          value: atLeast(prs, prsCapped),
          label: "pull requests",
        },
      ]
    : [];
}

function stars({ stars: n }: RepoStats): StatTileData[] {
  return n > 0 ? [{ icon: "star", value: count(n), label: "stars" }] : [];
}

/** Stars, pull requests, and issues when there are any, and since. A zero reads as a gap. */
export function repoStatTiles(stats: RepoStats): StatTileData[] {
  return [
    ...stars(stats),
    ...pulls(stats),
    ...issues(stats),
    ...since(stats.since),
  ];
}

/** Pull requests and issues when there are any, repositories, and since. Stars summed across repositories mean little. */
export function projectStatTiles(stats: ProjectStats): StatTileData[] {
  return [
    ...pulls(stats),
    ...issues(stats),
    {
      icon: "folder-git-2",
      value: count(stats.repositories),
      label: "repositories",
    },
    ...since(stats.since),
  ];
}

/**
 * The project a repository page was opened from, when the `from` a member
 * link carries names one that holds it. Anything else is ignored, so the
 * back link can't be made to name an arbitrary page.
 */
export function parentProject(
  repo: Pick<CodeRepo, "repo" | "owner" | "mine">,
  from: string | null,
): { id: string; title: string } | undefined {
  if (!from) return undefined;
  if (!repo.mine && from === repo.owner) {
    return { id: from, title: ORG_TITLES[from] ?? from };
  }
  const configured = PROJECTS.find(
    (project) => project.id === from && project.repos.includes(repo.repo),
  );
  return configured && { id: configured.id, title: configured.title };
}

/** A member repository's link from its project's page, which its back link returns to. */
export function memberHref(
  repo: Pick<CodeRepo, "owner" | "name">,
  projectId: string,
): string {
  return `/code/${repo.owner}/${repo.name}/?${new URLSearchParams({ from: projectId })}`;
}
