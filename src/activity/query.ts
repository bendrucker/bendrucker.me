import { sql, type SqlBool } from "kysely";
import type { InferResult, Kysely, WhereInterface } from "kysely";
import { z } from "zod";
import type { Database } from "@/db";
import { SITE } from "@/config";
import {
  activityYear,
  languagesInput,
  reposInput,
  yearsInput,
  type ActivityFilters,
} from "./filters";
import type { Repo } from "./types";

function repoQuery(db: Kysely<Database>) {
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
      "repos.createdAt",
      sql<number>`max(${sql.ref("repoActivity.lastActivity")})`.as(
        "lastActivity",
      ),
      sql<number>`sum(${sql.ref("repoActivity.prCount")})`.as("prCount"),
      sql<number>`sum(${sql.ref("repoActivity.reviewCount")})`.as(
        "reviewCount",
      ),
      sql<number>`sum(${sql.ref("repoActivity.issueCount")})`.as("issueCount"),
      sql<number>`sum(${sql.ref("repoActivity.mergeCount")})`.as("mergeCount"),
      sql<number>`max(${sql.ref("repoActivity.hasMergedPrs")})`.as(
        "hasMergedPrs",
      ),
      sql<string>`group_concat(distinct ${sql.ref("repoActivity.year")})`.as(
        "years",
      ),
    ])
    .groupBy("repos.id");
}

type FilterTables = "repos" | "repoActivity";
type FilterableQuery = WhereInterface<Database, FilterTables>;

function applyFilters(filters: ActivityFilters) {
  return <T extends FilterableQuery>(qb: T): T => {
    let q: FilterableQuery = qb;
    if (filters.owner === "personal") {
      q = q.where("repos.owner", "=", SITE.githubUsername);
    } else if (filters.owner === "external") {
      q = q.where("repos.owner", "!=", SITE.githubUsername);
    }
    if (filters.language) {
      q = q.where("repos.primaryLanguageName", "=", filters.language);
    }
    if (filters.search) {
      const escaped = filters.search
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
      q = q.where(
        sql<SqlBool>`${sql.ref("repos.name")} like ${`%${escaped}%`} escape '\\'`,
      );
    }
    // Kysely's `where` returns the interface rather than `this`, so the
    // builder's concrete type is lost on the first call and has to be restored.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return q as T;
  };
}

const yearHaving = sql<number>`max(${sql.ref("repoActivity.year")})`;

type RepoRow = InferResult<ReturnType<typeof repoQuery>>[number];

function mapRepoRow(row: RepoRow): Repo {
  return {
    name: row.name,
    owner: row.owner,
    description: row.description,
    url: row.url,
    primaryLanguage: row.primaryLanguageName
      ? {
          name: row.primaryLanguageName,
          color: row.primaryLanguageColor ?? "",
          extension: row.primaryLanguageExtension ?? null,
        }
      : null,
    stargazerCount: row.stargazerCount,
    createdAt: row.createdAt,
    lastActivity: new Date(row.lastActivity * 1000).toISOString(),
    activitySummary: {
      prCount: row.prCount,
      reviewCount: row.reviewCount,
      issueCount: row.issueCount,
      mergeCount: row.mergeCount,
      hasMergedPRs: row.hasMergedPrs === 1,
    },
    years: row.years
      ? row.years
          .split(",")
          .map(Number)
          .toSorted((a: number, b: number) => b - a)
      : [],
  };
}

const PAGE_SIZE = 20;

export class InvalidCursorError extends Error {
  readonly cursor: string;

  constructor(cursor: string) {
    super(`Invalid cursor: ${cursor}`);
    this.cursor = cursor;
  }
}

function parseRecentCursor(cursor: string): { time: number; id: number } {
  const parts = cursor.split("|");
  if (parts.length !== 2 || !parts[0] || isNaN(Number(parts[1]))) {
    throw new InvalidCursorError(cursor);
  }
  return { time: Number(parts[0]), id: Number(parts[1]) };
}

function parseOffsetCursor(cursor: string): number {
  const offset = parseInt(cursor, 10);
  if (isNaN(offset)) {
    throw new InvalidCursorError(cursor);
  }
  return offset;
}

// `all` and `limit` are the read model's own options rather than filters an
// action exposes: listing every repository for a year is the year page's
// business, and capping the language bar is the OG image's.
const reposQuery = reposInput.extend({ all: z.boolean().optional() });
const languagesQuery = languagesInput.extend({
  limit: z.int().positive().optional(),
});

export type ReposInput = z.input<typeof reposQuery>;
export type LanguagesInput = z.input<typeof languagesQuery>;
export type YearsInput = z.input<typeof yearsInput>;

export async function queryRepos(db: Kysely<Database>, input: ReposInput) {
  const { all, cursor, sort, ...filters } = reposQuery.parse(input);

  const countSubquery = db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .$call(applyFilters(filters))
    .select("repos.id")
    .groupBy("repos.id")
    .$if(!!filters.year, (qb) => qb.having(yearHaving, "=", filters.year!));

  const countResult = await db
    .selectFrom(countSubquery.as("sub"))
    .select(sql<number>`count(*)`.as("total"))
    .executeTakeFirstOrThrow();

  const total = countResult.total;

  if (all) {
    const rows = await repoQuery(db)
      .$call(applyFilters(filters))
      .$if(!!filters.year, (qb) => qb.having(yearHaving, "=", filters.year!))
      .orderBy(sql`last_activity`, "desc")
      .execute();
    const repos = rows.map((row) => mapRepoRow(row));
    return { repos, nextCursor: null, hasMore: false, total };
  }

  let query = repoQuery(db)
    .$call(applyFilters(filters))
    .$if(!!filters.year, (qb) => qb.having(yearHaving, "=", filters.year!));

  switch (sort) {
    case "recent": {
      const parsed = cursor ? parseRecentCursor(cursor) : null;
      query = query
        .$if(!!parsed, (qb) =>
          qb.having(
            sql<SqlBool>`(max(${sql.ref("repoActivity.lastActivity")}) < ${parsed!.time} or (max(${sql.ref("repoActivity.lastActivity")}) = ${parsed!.time} and ${sql.ref("repos.id")} < ${parsed!.id}))`,
          ),
        )
        .orderBy(sql`last_activity`, "desc")
        .orderBy("repos.id", "desc")
        .limit(PAGE_SIZE + 1);
      break;
    }
    case "active":
      query = query
        .orderBy(
          sql`sum(${sql.ref("repoActivity.prCount")}) + sum(${sql.ref("repoActivity.reviewCount")}) + sum(${sql.ref("repoActivity.issueCount")}) + sum(${sql.ref("repoActivity.mergeCount")})`,
          "desc",
        )
        .orderBy("repos.id", "desc")
        .limit(PAGE_SIZE + 1)
        .$if(!!cursor, (qb) => qb.offset(parseOffsetCursor(cursor!)));
      break;
    case "stars":
      query = query
        .orderBy("repos.stargazerCount", "desc")
        .orderBy("repos.id", "desc")
        .limit(PAGE_SIZE + 1)
        .$if(!!cursor, (qb) => qb.offset(parseOffsetCursor(cursor!)));
      break;
    case "name":
      query = query
        .orderBy("repos.name", "asc")
        .orderBy("repos.id", "asc")
        .limit(PAGE_SIZE + 1)
        .$if(!!cursor, (qb) => qb.offset(parseOffsetCursor(cursor!)));
      break;
    default: {
      const _exhaustive: never = sort;
      throw new Error(`Unhandled sort: ${_exhaustive}`);
    }
  }

  const results = await query.execute();
  const hasMore = results.length > PAGE_SIZE;
  const pageResults = hasMore ? results.slice(0, PAGE_SIZE) : results;

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = pageResults[pageResults.length - 1];
    if (sort === "recent") {
      nextCursor = `${last.lastActivity}|${last.id}`;
    } else {
      const offset = cursor ? parseOffsetCursor(cursor) : 0;
      nextCursor = String(offset + PAGE_SIZE);
    }
  }

  const repos = pageResults.map((row) => mapRepoRow(row));

  return { repos, nextCursor, hasMore, total };
}

// A year in the URL has two ways of naming nothing: it falls outside the range
// activity is recorded for, or nothing was contributed in it. Neither is an
// error, and the page and the markdown representation answer both the same way,
// so they branch on one value rather than each re-deriving the range.
export type YearRepos =
  | { found: false }
  | { found: true; year: number; repos: Repo[]; total: number };

export async function queryYearRepos(
  db: Kysely<Database>,
  year: number,
): Promise<YearRepos> {
  const parsed = activityYear.safeParse(year);
  if (!parsed.success) return { found: false };

  // The year listing shows every repository for the year rather than a page of
  // them, so it has no cursor to follow.
  const { repos, total } = await queryRepos(db, {
    year: parsed.data,
    all: true,
  });
  if (total === 0) return { found: false };

  return { found: true, year: parsed.data, repos, total };
}

export async function queryLanguages(
  db: Kysely<Database>,
  input: LanguagesInput,
) {
  const { limit, ...filters } = languagesQuery.parse(input);

  const subquery = db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .$call(applyFilters(filters))
    .where("repos.primaryLanguageName", "is not", null)
    .where("repos.primaryLanguageColor", "is not", null)
    .select([
      "repos.id",
      "repos.primaryLanguageName",
      "repos.primaryLanguageColor",
    ])
    .groupBy("repos.id")
    .$if(!!filters.year, (qb) => qb.having(yearHaving, "=", filters.year!));

  const rows = await db
    .selectFrom(subquery.as("sub"))
    .leftJoin(
      "languageExtensions",
      "languageExtensions.name",
      "sub.primaryLanguageName",
    )
    .select([
      "sub.primaryLanguageName as name",
      "sub.primaryLanguageColor as color",
      "languageExtensions.extension",
      sql<number>`count(*)`.as("count"),
    ])
    .groupBy("sub.primaryLanguageName")
    .orderBy(sql`count`, "desc")
    .$if(limit != null, (qb) => qb.limit(limit!))
    .execute();

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const languages = rows.map((row) => ({
    name: row.name!,
    color: row.color!,
    extension: row.extension,
    count: row.count,
  }));

  return { languages, total };
}

export async function queryYears(db: Kysely<Database>, input: YearsInput) {
  const filters = yearsInput.parse(input);

  const rows = await db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .$call(applyFilters(filters))
    .select([
      "repoActivity.year",
      sql<number>`count(distinct ${sql.ref("repos.id")})`.as("count"),
    ])
    .groupBy("repoActivity.year")
    .orderBy("repoActivity.year", "desc")
    .execute();

  return { years: rows };
}

export async function queryYearsByLastActivity(db: Kysely<Database>) {
  const subquery = db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .select([
      "repos.id",
      sql<number>`max(${sql.ref("repoActivity.year")})`.as("maxYear"),
    ])
    .groupBy("repos.id");

  const rows = await db
    .selectFrom(subquery.as("sub"))
    .select(["sub.maxYear as year", sql<number>`count(*)`.as("count")])
    .groupBy("sub.maxYear")
    .orderBy("sub.maxYear", "desc")
    .execute();

  return { years: rows };
}

export async function queryActivityTotals(db: Kysely<Database>) {
  return db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .select([
      sql<number>`count(distinct ${sql.ref("repos.id")})`.as("repos"),
      sql<number>`coalesce(sum(${sql.ref("repoActivity.prCount")}), 0)`.as(
        "prs",
      ),
      sql<number>`coalesce(sum(${sql.ref("repoActivity.reviewCount")}), 0)`.as(
        "reviews",
      ),
      sql<number>`coalesce(sum(${sql.ref("repoActivity.issueCount")}), 0)`.as(
        "issues",
      ),
      sql<number>`count(distinct ${sql.ref("repoActivity.year")})`.as("years"),
    ])
    .executeTakeFirstOrThrow();
}
