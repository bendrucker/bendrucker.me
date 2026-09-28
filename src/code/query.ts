// The Code pages' read model: repositories with the pull requests and issues
// opened in them, and all-time totals for a repository or a project.
import { sql, type InferResult, type Kysely } from "kysely";
import { SITE } from "@/config";
import type { Database } from "@/db";
import {
  PROJECTS,
  isMine,
  projects,
  repoScore,
  type Project,
  type ProjectOptions,
} from "./rank";
import type {
  CodeRepo,
  CodeStats,
  CodeWindow,
  IssueRow,
  ProjectStats,
  PullRow,
  RepoStats,
} from "./types";

export type ScoredRepo = CodeRepo & { score: number };

/**
 * The pull requests or authored issues a year's sync reads per repository. A
 * year stored at exactly this many was cut off there: pull requests before the
 * sync read GitHub's total, and issue rows still, since only the first page
 * names the issues to fetch.
 */
const CONTRIBUTION_PAGE = 100;

function repoRows(db: Kysely<Database>) {
  return db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .leftJoin(
      "languageExtensions",
      "languageExtensions.name",
      "repos.primaryLanguageName",
    )
    .select([
      "repos.id",
      "repos.owner",
      "repos.name",
      "repos.description",
      "repos.url",
      "repos.primaryLanguageName",
      "repos.primaryLanguageColor",
      "languageExtensions.extension as primaryLanguageExtension",
      "repos.stargazerCount",
      sql<number>`max(${sql.ref("repoActivity.lastActivity")})`.as(
        "lastActivity",
      ),
    ])
    .groupBy("repos.id")
    .orderBy(sql`last_activity`, "desc")
    .orderBy("repos.id", "desc");
}

/**
 * The repositories with a pull request or issue on record. One without either
 * is left off every list and page, since it would have nothing to show.
 */
function workedRepoRows(db: Kysely<Database>) {
  return repoRows(db).having((eb) =>
    eb.or([
      eb(sql<number>`sum(${sql.ref("repoActivity.prCount")})`, ">", 0),
      eb.exists(
        eb
          .selectFrom("pullRequests")
          .whereRef("pullRequests.repoId", "=", "repos.id")
          .select("pullRequests.id"),
      ),
      eb.exists(
        eb
          .selectFrom("issues")
          .whereRef("issues.repoId", "=", "repos.id")
          .select("issues.id"),
      ),
    ]),
  );
}

function pullRows(db: Kysely<Database>) {
  return db
    .selectFrom("pullRequests")
    .innerJoin("repos", "repos.id", "pullRequests.repoId")
    .select([
      "pullRequests.id",
      "pullRequests.repoId",
      "repos.owner",
      "repos.name",
      "repos.url as repoUrl",
      "pullRequests.number",
      "pullRequests.title",
      "pullRequests.state",
      "pullRequests.isDraft",
      "pullRequests.createdAt",
      "pullRequests.mergedAt",
      "pullRequests.additions",
      "pullRequests.deletions",
      "pullRequests.reactions",
    ])
    .orderBy("pullRequests.createdAt", "desc");
}

function issueRows(db: Kysely<Database>) {
  return db
    .selectFrom("issues")
    .innerJoin("repos", "repos.id", "issues.repoId")
    .select([
      "issues.id",
      "issues.repoId",
      "repos.owner",
      "repos.name",
      "repos.url as repoUrl",
      "issues.number",
      "issues.title",
      "issues.state",
      "issues.stateReason",
      "issues.createdAt",
      "issues.closedAt",
      "issues.reactions",
    ])
    .orderBy("issues.createdAt", "desc");
}

type RepoRecord = InferResult<ReturnType<typeof repoRows>>[number];
type PullRecord = InferResult<ReturnType<typeof pullRows>>[number];
type IssueRecord = InferResult<ReturnType<typeof issueRows>>[number];

function toPull(row: PullRecord): PullRow {
  return {
    id: row.id,
    repo: `${row.owner}/${row.name}`,
    number: row.number,
    title: row.title,
    url: `${row.repoUrl}/pull/${row.number}`,
    state: row.state,
    isDraft: row.isDraft === 1,
    createdAt: row.createdAt,
    mergedAt: row.mergedAt,
    additions: row.additions,
    deletions: row.deletions,
    reactions: row.reactions,
  };
}

function toIssue(row: IssueRecord): IssueRow {
  return {
    id: row.id,
    repo: `${row.owner}/${row.name}`,
    number: row.number,
    title: row.title,
    url: `${row.repoUrl}/issues/${row.number}`,
    state: row.state,
    stateReason: row.stateReason,
    createdAt: row.createdAt,
    closedAt: row.closedAt,
    reactions: row.reactions,
  };
}

function byRepo<T extends { repoId: number }>(rows: readonly T[]) {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.repoId);
    if (list) list.push(row);
    else grouped.set(row.repoId, [row]);
  }
  return grouped;
}

function assemble(
  repos: readonly RepoRecord[],
  pulls: readonly PullRecord[],
  issues: readonly IssueRecord[],
): CodeRepo[] {
  const pullsByRepo = byRepo(pulls);
  const issuesByRepo = byRepo(issues);

  return repos.map((row) => {
    const repo = `${row.owner}/${row.name}`;
    return {
      repo,
      owner: row.owner,
      name: row.name,
      description: row.description,
      url: row.url,
      language: row.primaryLanguageName
        ? {
            name: row.primaryLanguageName,
            color: row.primaryLanguageColor ?? "",
            extension: row.primaryLanguageExtension ?? null,
          }
        : null,
      stars: row.stargazerCount,
      lastActivity: new Date(row.lastActivity * 1000).toISOString(),
      mine: isMine(repo),
      pulls: (pullsByRepo.get(row.id) ?? []).map((pull) => toPull(pull)),
      issues: (issuesByRepo.get(row.id) ?? []).map((issue) => toIssue(issue)),
    };
  });
}

function scored(repo: CodeRepo): ScoredRepo {
  return { ...repo, score: repoScore(repo) };
}

/**
 * The repositories touched inside the window, most recent first, each with
 * the pull requests and issues opened in it since the window began.
 */
export async function queryCodeRows(
  db: Kysely<Database>,
  window: CodeWindow,
): Promise<CodeRepo[]> {
  const fromSeconds = Math.floor(window.from.getTime() / 1000);
  const fromIso = window.from.toISOString();

  const [repos, pulls, issues] = await Promise.all([
    workedRepoRows(db)
      .having(
        sql<number>`max(${sql.ref("repoActivity.lastActivity")})`,
        ">=",
        fromSeconds,
      )
      .execute(),
    pullRows(db).where("pullRequests.createdAt", ">=", fromIso).execute(),
    issueRows(db).where("issues.createdAt", ">=", fromIso).execute(),
  ]);

  return assemble(repos, pulls, issues);
}

async function workFor(db: Kysely<Database>, repos: readonly RepoRecord[]) {
  const ids = repos.map((repo) => repo.id);
  if (ids.length === 0) return { pulls: [], issues: [] };

  const [pulls, issues] = await Promise.all([
    pullRows(db).where("pullRequests.repoId", "in", ids).execute(),
    issueRows(db).where("issues.repoId", "in", ids).execute(),
  ]);
  return { pulls, issues };
}

/**
 * Per repository: the stored rows, the yearly counts, and the dates that bound
 * when contributing there began. The yearly pull request counts reach back
 * past the per-PR rows wherever a backfill filled them and the rows did not.
 *
 * Issues are counted from the rows alone. The yearly issue count comes from a
 * search for every issue the owner is involved in, opened by anyone and
 * updated any time after the year began, so it is neither the authored issues
 * the page lists nor confined to its year.
 */
async function queryStatRows(db: Kysely<Database>, ids: readonly number[]) {
  if (ids.length === 0) return [];

  return db
    .selectFrom("repos")
    .where("repos.id", "in", ids)
    .select((eb) => [
      "repos.id",
      "repos.owner",
      "repos.name",
      "repos.createdAt",
      "repos.stargazerCount",
      eb
        .selectFrom("pullRequests")
        .whereRef("pullRequests.repoId", "=", "repos.id")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .as("pullRows"),
      eb
        .selectFrom("repoActivity")
        .whereRef("repoActivity.repoId", "=", "repos.id")
        .select(
          sql<number>`coalesce(sum(${sql.ref("repoActivity.prCount")}), 0)`.as(
            "count",
          ),
        )
        .as("pullsCounted"),
      eb
        .selectFrom("repoActivity")
        .whereRef("repoActivity.repoId", "=", "repos.id")
        .where("repoActivity.prCount", "=", CONTRIBUTION_PAGE)
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .as("pullYearsCapped"),
      eb
        .selectFrom("issues")
        .whereRef("issues.repoId", "=", "repos.id")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .as("issueRows"),
      eb
        .selectFrom("issues")
        .whereRef("issues.repoId", "=", "repos.id")
        .groupBy(sql`substr(${sql.ref("issues.createdAt")}, 1, 4)`)
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .orderBy(sql`count(*)`, "desc")
        .limit(1)
        .as("issueRowsBusiestYear"),
      eb
        .selectFrom("pullRequests")
        .whereRef("pullRequests.repoId", "=", "repos.id")
        .select(({ fn }) => fn.min("pullRequests.createdAt").as("first"))
        .as("firstPull"),
      eb
        .selectFrom("issues")
        .whereRef("issues.repoId", "=", "repos.id")
        .select(({ fn }) => fn.min("issues.createdAt").as("first"))
        .as("firstIssue"),
      eb
        .selectFrom("repoActivity")
        .whereRef("repoActivity.repoId", "=", "repos.id")
        .select(({ fn }) => fn.min("repoActivity.lastActivity").as("first"))
        .as("firstActivity"),
    ])
    .execute();
}

type StatRow = Awaited<ReturnType<typeof queryStatRows>>[number];

/**
 * The earliest date on record. A repository of the site owner's own dates
 * from its creation, and anyone else's from the first contribution stored.
 * The yearly rows keep only each year's latest activity, so theirs is a bound
 * that the per-PR rows tighten.
 */
function sinceOf(row: StatRow): string | null {
  const candidates = [
    row.firstPull,
    row.firstIssue,
    row.firstActivity === null
      ? null
      : new Date(row.firstActivity * 1000).toISOString(),
    isMine(`${row.owner}/${row.name}`) ? row.createdAt : null,
  ].filter((value) => value !== null);

  return candidates.toSorted()[0] ?? null;
}

function totals(rows: readonly StatRow[]): CodeStats {
  const since = rows
    .map((row) => sinceOf(row))
    .filter((value) => value !== null)
    .toSorted()[0];

  return {
    prs: rows.reduce(
      (sum, row) => sum + Math.max(row.pullRows ?? 0, row.pullsCounted ?? 0),
      0,
    ),
    prsCapped: rows.some((row) => (row.pullYearsCapped ?? 0) > 0),
    issues: rows.reduce((sum, row) => sum + (row.issueRows ?? 0), 0),
    issuesCapped: rows.some(
      (row) => (row.issueRowsBusiestYear ?? 0) >= CONTRIBUTION_PAGE,
    ),
    since: since ?? null,
  };
}

export interface RepoPage {
  repo: ScoredRepo;
  stats: RepoStats;
}

/** One repository with everything stored for it, or null when it has no work. */
export async function queryRepo(
  db: Kysely<Database>,
  owner: string,
  name: string,
): Promise<RepoPage | null> {
  const row = await workedRepoRows(db)
    .where("repos.owner", "=", owner)
    .where("repos.name", "=", name)
    .executeTakeFirst();
  if (!row) return null;

  const [{ pulls, issues }, stats] = await Promise.all([
    workFor(db, [row]),
    queryStatRows(db, [row.id]),
  ]);
  const [repo] = assemble([row], pulls, issues);

  return {
    repo: scored(repo),
    stats: { stars: row.stargazerCount, ...totals(stats) },
  };
}

export interface ProjectPage {
  project: Project<ScoredRepo>;
  stats: ProjectStats;
}

/**
 * A configured family by its id, or someone else's organization by its login,
 * over every repository with work stored for it. Null when that leaves fewer
 * than two.
 * Passing an empty `configured` reads the id as an organization only.
 */
export async function queryProject(
  db: Kysely<Database>,
  id: string,
  { configured: families = PROJECTS }: ProjectOptions = {},
): Promise<ProjectPage | null> {
  const configured = families.find((project) => project.id === id);
  if (!configured && id === SITE.githubUsername) return null;

  const rows = await workedRepoRows(db)
    .where((eb) =>
      configured
        ? eb.or(
            configured.repos.map((repo) => {
              const [owner, name] = repo.split("/");
              return eb.and([
                eb("repos.owner", "=", owner),
                eb("repos.name", "=", name),
              ]);
            }),
          )
        : eb("repos.owner", "=", id),
    )
    .execute();

  const [{ pulls, issues }, stats] = await Promise.all([
    workFor(db, rows),
    queryStatRows(
      db,
      rows.map((row) => row.id),
    ),
  ]);

  const members = assemble(rows, pulls, issues).map((repo) => scored(repo));
  const project = projects(members, {
    configured: configured ? [configured] : [],
  }).find((candidate) => candidate.id === id);
  if (!project) return null;

  return {
    project,
    stats: { ...totals(stats), repositories: project.members.length },
  };
}
