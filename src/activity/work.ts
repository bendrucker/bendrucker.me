// The write path for single pull requests and issues. A merged or closed row is
// terminal: the sync never asks GitHub for it again, and its upsert changes
// nothing if it does arrive. Only an open row moves.
import { sql, type Kysely, type SqlBool } from "kysely";
import type {
  Issue,
  PullRequest,
  RepoActivity,
  RepositoryRef,
  WorkItems,
} from "@workspace/github";
import type { Database } from "../db";

// A payload read back from a JSON cache holds strings where the fetch held
// dates, so both go through `new Date`.
const iso = (date: Date | string) => new Date(date).toISOString();
const isoOrNull = (date: Date | string | null) =>
  date === null ? null : iso(date);

// The repository row an item belongs to: the one its name matches, or the one
// its stored row already names, which is where an item lands after its
// repository was renamed. An item matching neither inserts nothing rather than
// failing the batch on `repo_id`.
//
// The `where` also keeps SQLite from reading the upsert's `ON CONFLICT` as a
// join constraint, which it would after a bare `FROM`.
function owningRepo(
  db: Kysely<Database>,
  repository: RepositoryRef,
  stored: ReturnType<typeof storedRepoId>,
) {
  return db
    .selectFrom("repos")
    .where((eb) =>
      eb.or([
        eb.and([
          eb("repos.owner", "=", repository.owner),
          eb("repos.name", "=", repository.name),
        ]),
        eb("repos.id", "=", stored),
      ]),
    )
    .limit(1);
}

function storedRepoId(
  db: Kysely<Database>,
  table: "pullRequests" | "issues",
  id: string,
) {
  return db.selectFrom(table).select(`${table}.repoId`).where("id", "=", id);
}

export function upsertPullRequest(db: Kysely<Database>, pr: PullRequest) {
  return db
    .insertInto("pullRequests")
    .columns([
      "id",
      "repoId",
      "number",
      "title",
      "state",
      "isDraft",
      "createdAt",
      "mergedAt",
      "additions",
      "deletions",
      "reactions",
    ])
    .expression(
      owningRepo(
        db,
        pr.repository,
        storedRepoId(db, "pullRequests", pr.id),
      ).select((eb) => [
        eb.val(pr.id).as("id"),
        "repos.id as repoId",
        eb.val(pr.number).as("number"),
        eb.val(pr.title).as("title"),
        eb.val(pr.state).as("state"),
        eb.val(pr.isDraft ? 1 : 0).as("isDraft"),
        eb.val(iso(pr.createdAt)).as("createdAt"),
        eb.val(isoOrNull(pr.mergedAt)).as("mergedAt"),
        eb.val(pr.additions).as("additions"),
        eb.val(pr.deletions).as("deletions"),
        eb.val(pr.reactions).as("reactions"),
      ]),
    )
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          state: eb.ref("excluded.state"),
          isDraft: eb.ref("excluded.isDraft"),
          mergedAt: eb.ref("excluded.mergedAt"),
          additions: eb.ref("excluded.additions"),
          deletions: eb.ref("excluded.deletions"),
          reactions: eb.ref("excluded.reactions"),
        }))
        .where((eb) =>
          eb.and([
            eb("pullRequests.state", "=", "OPEN"),
            eb.or([
              eb("pullRequests.title", "is not", eb.ref("excluded.title")),
              eb("pullRequests.state", "is not", eb.ref("excluded.state")),
              eb("pullRequests.isDraft", "is not", eb.ref("excluded.isDraft")),
              eb(
                "pullRequests.mergedAt",
                "is not",
                eb.ref("excluded.mergedAt"),
              ),
              eb(
                "pullRequests.additions",
                "is not",
                eb.ref("excluded.additions"),
              ),
              eb(
                "pullRequests.deletions",
                "is not",
                eb.ref("excluded.deletions"),
              ),
              eb(
                "pullRequests.reactions",
                "is not",
                eb.ref("excluded.reactions"),
              ),
            ]),
          ]),
        ),
    );
}

export function upsertIssue(db: Kysely<Database>, issue: Issue) {
  return db
    .insertInto("issues")
    .columns([
      "id",
      "repoId",
      "number",
      "title",
      "state",
      "stateReason",
      "createdAt",
      "closedAt",
      "reactions",
    ])
    .expression(
      owningRepo(
        db,
        issue.repository,
        storedRepoId(db, "issues", issue.id),
      ).select((eb) => [
        eb.val(issue.id).as("id"),
        "repos.id as repoId",
        eb.val(issue.number).as("number"),
        eb.val(issue.title).as("title"),
        eb.val(issue.state).as("state"),
        eb.val(issue.stateReason).as("stateReason"),
        eb.val(iso(issue.createdAt)).as("createdAt"),
        eb.val(isoOrNull(issue.closedAt)).as("closedAt"),
        eb.val(issue.reactions).as("reactions"),
      ]),
    )
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          state: eb.ref("excluded.state"),
          stateReason: eb.ref("excluded.stateReason"),
          closedAt: eb.ref("excluded.closedAt"),
          reactions: eb.ref("excluded.reactions"),
        }))
        .where((eb) =>
          eb.and([
            eb("issues.state", "=", "OPEN"),
            eb.or([
              eb("issues.title", "is not", eb.ref("excluded.title")),
              eb("issues.state", "is not", eb.ref("excluded.state")),
              eb(
                "issues.stateReason",
                "is not",
                eb.ref("excluded.stateReason"),
              ),
              eb("issues.closedAt", "is not", eb.ref("excluded.closedAt")),
              eb("issues.reactions", "is not", eb.ref("excluded.reactions")),
            ]),
          ]),
        ),
    );
}

const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * The fetched pull requests and issues, in a stable order. They follow every
 * repository row, since each one resolves its repository by name.
 */
export function workStatements(db: Kysely<Database>, work: WorkItems) {
  return [
    ...work.pullRequests
      .toSorted(byId)
      .map((pr) => upsertPullRequest(db, pr).compile()),
    ...work.issues
      .toSorted(byId)
      .map((issue) => upsertIssue(db, issue).compile()),
  ];
}

/** Every authored item a payload names, by id. */
export function payloadWorkIds(repos: readonly RepoActivity[]): string[] {
  return repos.flatMap((repo) => [...repo.pullRequestIds, ...repo.issueIds]);
}

/**
 * The ids worth reading from GitHub: what the payload names, less what is
 * already stored merged or closed, plus every open row, including the ones the
 * payload's window starts too late to name. The ids travel as one JSON
 * parameter, since D1 binds at most a hundred.
 */
export async function queryWorkToFetch(
  db: Kysely<Database>,
  repos: readonly RepoActivity[],
): Promise<string[]> {
  const carried = payloadWorkIds(repos);
  const named = sql<SqlBool>`id in (select value from json_each(${JSON.stringify(carried)}))`;

  const rows = await db
    .selectFrom("pullRequests")
    .select((eb) => ["id", eb("state", "=", "OPEN").as("open")])
    .where((eb) => eb.or([eb("state", "=", "OPEN"), named]))
    .unionAll(
      db
        .selectFrom("issues")
        .select((eb) => ["id", eb("state", "=", "OPEN").as("open")])
        .where((eb) => eb.or([eb("state", "=", "OPEN"), named])),
    )
    .execute();

  const terminal = new Set(
    rows.filter((row) => !row.open).map((row) => row.id),
  );
  const open = rows.filter((row) => row.open).map((row) => row.id);

  return [
    ...new Set([...carried.filter((id) => !terminal.has(id)), ...open]),
  ].toSorted();
}
