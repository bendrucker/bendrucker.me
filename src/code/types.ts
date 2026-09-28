/** An authored pull request. Timestamps are ISO strings. */
export interface PullRow {
  id: string;
  /** `owner/name`. */
  repo: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  createdAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  /** Every reaction of every kind. */
  reactions: number;
}

/** An authored issue. Timestamps are ISO strings. */
export interface IssueRow {
  id: string;
  /** `owner/name`. */
  repo: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  /** `COMPLETED`, `NOT_PLANNED`, and so on, or null while open. */
  stateReason: string | null;
  createdAt: string;
  closedAt: string | null;
  reactions: number;
}

export interface CodeRepo {
  /** `owner/name`, the key pull requests and issues carry. */
  repo: string;
  owner: string;
  name: string;
  description: string;
  url: string;
  language: { name: string; color: string; extension: string | null } | null;
  stars: number;
  /** ISO timestamp of the latest contribution. */
  lastActivity: string;
  /** Owned by the site's own GitHub user. */
  mine: boolean;
  /** Newest first. */
  pulls: PullRow[];
  /** Newest first. */
  issues: IssueRow[];
}

/** Totals over everything stored, whatever window the page lists. */
export interface CodeStats {
  prs: number;
  issues: number;
  /** ISO timestamp of the earliest contribution on record. */
  since: string | null;
}

export interface RepoStats extends CodeStats {
  stars: number;
}

export interface ProjectStats extends CodeStats {
  repositories: number;
}

export interface CodeWindow {
  /** Repositories last touched on or after this, and work opened since. */
  from: Date;
}
