import { CamelCasePlugin, Kysely, type Generated } from "kysely";
import { D1Dialect } from "./d1-dialect";

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

export interface SyncStateTable {
  id: Generated<number>;
  version: Generated<number>;
  payloadHash: string | null;
  changedAt: Generated<string>;
  syncedAt: Generated<string>;
}

// Written only by activity-hub through the Publish entrypoint. Distances are
// metres, durations seconds, elevations metres. `elevationProfile` and
// `photoKeys` are JSON text because D1 has no array type.
export interface ActivityFeedTable {
  activityId: string;
  stravaId: string | null;
  name: string | null;
  sport: string;
  startedAt: string;
  timezone: string;
  distanceM: number | null;
  movingS: number | null;
  elevationM: number | null;
  averageWatts: number | null;
  powerSource: string;
  polyline: string | null;
  elevationProfile: string | null;
  photoKeys: string;
  updatedAt: Generated<string>;
}

export interface ActivityPowerCurveTable {
  activityId: string;
  durationS: number;
  watts: number;
}

export interface Database {
  repos: ReposTable;
  repoActivity: RepoActivityTable;
  languageExtensions: LanguageExtensionsTable;
  syncState: SyncStateTable;
  activityFeed: ActivityFeedTable;
  activityPowerCurve: ActivityPowerCurveTable;
}

export function createDb(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
    plugins: [new CamelCasePlugin()],
  });
}

export async function getDb(): Promise<Kysely<Database>> {
  const { env } = await import("cloudflare:workers");
  return createDb(env.ACTIVITY_DB);
}
