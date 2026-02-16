import { sql, type SqlBool } from "kysely";
import type { Kysely, WhereInterface } from "kysely";
import type { Database } from "@/db";
import type { Repo } from "@/components/activity/composables/useActivityApi";
import { SITE } from "@/config";

export interface FilterParams {
  owner?: "personal" | "external";
  language?: string;
  search?: string;
  year?: number;
}

export function repoQuery(db: Kysely<Database>) {
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

export function applyFilters(
  filters: FilterParams,
  options?: { excludeLanguage?: boolean },
) {
  return <T extends FilterableQuery>(qb: T): T => {
    let q: FilterableQuery = qb;
    if (filters.owner === "personal") {
      q = q.where("repos.owner", "=", SITE.githubUsername);
    } else if (filters.owner === "external") {
      q = q.where("repos.owner", "!=", SITE.githubUsername);
    }
    if (filters.language && !options?.excludeLanguage) {
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
    return q as T;
  };
}

export const yearHaving = sql<number>`max(${sql.ref("repoActivity.year")})`;

export function mapRepoRow(row: {
  id: number;
  owner: string;
  name: string;
  description: string;
  url: string;
  primaryLanguageName: string | null;
  primaryLanguageColor: string | null;
  primaryLanguageExtension: string | null;
  stargazerCount: number;
  createdAt: string | null;
  lastActivity: number;
  prCount: number;
  reviewCount: number;
  issueCount: number;
  mergeCount: number;
  hasMergedPrs: number;
  years: string;
}): Repo {
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
          .sort((a: number, b: number) => b - a)
      : [],
  };
}

const PAGE_SIZE = 20;

type SortMode = "recent" | "active" | "stars" | "name";

export interface ReposInput {
  cursor?: string | null;
  sort?: SortMode;
  owner?: "personal" | "external" | null;
  language?: string | null;
  search?: string | null;
  year?: number | null;
}

export interface LanguagesInput {
  owner?: "personal" | "external" | null;
  search?: string | null;
  year?: number | null;
}

export interface YearsInput {
  owner?: "personal" | "external" | null;
  language?: string | null;
  search?: string | null;
}

function toFilterParams(input: {
  owner?: string | null;
  language?: string | null;
  search?: string | null;
  year?: number | null;
}): FilterParams {
  const params: FilterParams = {};
  if (input.owner === "personal" || input.owner === "external")
    params.owner = input.owner;
  if (input.language) params.language = input.language;
  if (input.search) params.search = input.search;
  if (input.year != null) params.year = input.year;
  return params;
}

export async function queryRepos(db: Kysely<Database>, input: ReposInput) {
  const filters = toFilterParams(input);
  const sort: SortMode = input.sort ?? "recent";
  const cursor = input.cursor ?? null;

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

  let query = repoQuery(db)
    .$call(applyFilters(filters))
    .$if(!!filters.year, (qb) => qb.having(yearHaving, "=", filters.year!));

  switch (sort) {
    case "recent":
      query = query
        .$if(!!cursor, (qb) => {
          const parts = cursor!.split("|");
          if (parts.length !== 2 || !parts[0] || isNaN(Number(parts[1])))
            return qb;
          const cursorTime = Number(parts[0]);
          const cursorId = Number(parts[1]);
          return qb.having(
            sql<SqlBool>`(max(${sql.ref("repoActivity.lastActivity")}) < ${cursorTime} or (max(${sql.ref("repoActivity.lastActivity")}) = ${cursorTime} and ${sql.ref("repos.id")} < ${cursorId}))`,
          );
        })
        .orderBy(sql`last_activity`, "desc")
        .orderBy("repos.id", "desc")
        .limit(PAGE_SIZE + 1);
      break;
    case "active":
      query = query
        .orderBy(
          sql`sum(${sql.ref("repoActivity.prCount")}) + sum(${sql.ref("repoActivity.reviewCount")}) + sum(${sql.ref("repoActivity.issueCount")}) + sum(${sql.ref("repoActivity.mergeCount")})`,
          "desc",
        )
        .orderBy("repos.id", "desc")
        .limit(PAGE_SIZE + 1)
        .$if(!!cursor, (qb) => qb.offset(parseInt(cursor!, 10) || 0));
      break;
    case "stars":
      query = query
        .orderBy("repos.stargazerCount", "desc")
        .orderBy("repos.id", "desc")
        .limit(PAGE_SIZE + 1)
        .$if(!!cursor, (qb) => qb.offset(parseInt(cursor!, 10) || 0));
      break;
    case "name":
      query = query
        .orderBy("repos.name", "asc")
        .orderBy("repos.id", "asc")
        .limit(PAGE_SIZE + 1)
        .$if(!!cursor, (qb) => qb.offset(parseInt(cursor!, 10) || 0));
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
      const offset = cursor ? parseInt(cursor, 10) || 0 : 0;
      nextCursor = String(offset + PAGE_SIZE);
    }
  }

  const repos = pageResults.map(mapRepoRow);

  return { repos, nextCursor, hasMore, total };
}

export async function queryLanguages(
  db: Kysely<Database>,
  input: LanguagesInput,
) {
  const filters = toFilterParams(input);

  const subquery = db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .$call(applyFilters(filters, { excludeLanguage: true }))
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
  const filters = toFilterParams(input);

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
