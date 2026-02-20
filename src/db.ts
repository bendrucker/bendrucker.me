import { CamelCasePlugin, Kysely, type Generated } from "kysely";
import { D1Dialect } from "@/d1-dialect";
import type { Runtime } from "@astrojs/cloudflare";

export interface ReposTable {
  id: Generated<number>;
  owner: string;
  name: string;
  description: string;
  url: string;
  primaryLanguageName: string | null;
  primaryLanguageColor: string | null;
  stargazerCount: number;
  createdAt: string | null;
  updatedAt: Generated<string>;
}

export interface RepoActivityTable {
  id: Generated<number>;
  repoId: number;
  year: Generated<number>;
  prCount: number;
  reviewCount: number;
  issueCount: number;
  mergeCount: number;
  hasMergedPrs: 0 | 1;
  lastActivity: number;
}

export interface LanguageExtensionsTable {
  name: string;
  extension: string;
}

export interface Database {
  repos: ReposTable;
  repoActivity: RepoActivityTable;
  languageExtensions: LanguageExtensionsTable;
}

export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
    plugins: [new CamelCasePlugin()],
  });
}

interface CloudflareEnv {
  ACTIVITY_DB: D1Database;
}

export function getDb(locals: object): Kysely<Database> {
  const runtime = (locals as Runtime<CloudflareEnv>).runtime;
  return createDb(runtime.env.ACTIVITY_DB);
}
