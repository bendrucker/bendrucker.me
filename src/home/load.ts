import { queryRideById, type RideDetail } from "@/activity/feed";
import { queryCodeRows } from "@/code/query";
import { buildCodeRows, codeWindow } from "@/code/rows";
import { rankHighlights } from "@/code/view";
import { isEnabled, type CategoryId } from "@/config";
import { getDb } from "@/db";
import { rethrowLocally } from "@/fallback";
import { loadMediaFeed } from "@/media/load";
import type { MediaCategory, MediaRow } from "@/media/types";
import { queryRideHighlights } from "@/rides/query";
import { loadWriting } from "@/writing/load";
import { highlightRows } from "@/writing/rows";
import { homeCards, type HomeCard, type HomeSources } from "./cards";
import {
  codeFeature,
  rideFeature,
  withoutFeatured,
  type HomeFeatures,
} from "./features";

async function mediaHighlights(id: MediaCategory): Promise<MediaRow[]> {
  const { rows, highlightKeys } = await loadMediaFeed(id);
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return highlightKeys.flatMap((key) => byKey.get(key) ?? []);
}

/**
 * One category's highlights, or none when it is off. A failed query hides
 * only its own card. Locally the failure is thrown so the page says what broke.
 */
async function read<T>(
  id: CategoryId,
  query: () => Promise<T[]>,
): Promise<T[]> {
  if (!isEnabled(id)) return [];
  try {
    return await query();
  } catch (error) {
    rethrowLocally(error, `Failed to load the ${id} highlights`);
    return [];
  }
}

/**
 * The featured ride's track and photos. A failure leaves the feature its name
 * and figures, which the highlights already carry.
 */
async function rideDetail(id: string): Promise<RideDetail | null> {
  try {
    return await queryRideById(await getDb(), id);
  } catch (error) {
    rethrowLocally(error, "Failed to load the featured ride", { id });
    return null;
  }
}

export interface HomePage {
  cards: HomeCard[];
  features: HomeFeatures;
}

/**
 * Every enabled category's highlights, each read the way its route reads them,
 * and the Rides and Code cards' features.
 */
export async function loadHome(now = new Date()): Promise<HomePage> {
  const [rides, repos, reading, writing, watching, listening] =
    await Promise.all([
      read("rides", async () => queryRideHighlights(await getDb())),
      read("code", async () => queryCodeRows(await getDb(), codeWindow(now))),
      read("reading", async () => mediaHighlights("reading")),
      read("writing", async () => highlightRows((await loadWriting(now)).rows)),
      read("watching", async () => mediaHighlights("watching")),
      read("listening", async () => mediaHighlights("listening")),
    ]);
  const code = rankHighlights(buildCodeRows(repos));

  const sources: HomeSources = {
    rides,
    code,
    reading,
    writing,
    watching,
    listening,
  };
  const [topRide] = rides;
  const [topCode] = code;
  const features: HomeFeatures = {
    rides: topRide && rideFeature(topRide, await rideDetail(topRide.id)),
    code: topCode && codeFeature(topCode, repos),
  };
  return {
    cards: withoutFeatured(homeCards(sources, now), features),
    features,
  };
}
