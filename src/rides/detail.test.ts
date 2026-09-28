import { beforeEach, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { queryRideById } from "@/activity/feed";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { Database } from "@/db";
import { createTestDb, noClimbNames, testStore } from "@/test/db";
import {
  rideDetailUrl,
  rideDetailWire,
  rideKey,
  toRideDetailWire,
} from "./detail";

/** Google's documented polyline example. */
const GOOGLE_EXAMPLE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

let db: Kysely<Database>;

beforeEach(() => {
  db = createTestDb();
});

function ride(
  activityId: string,
  overrides: Partial<PublishedActivity> = {},
): PublishedActivity {
  return {
    activityId,
    stravaId: activityId,
    name: `Ride ${activityId}`,
    description: null,
    sport: "ride",
    startedAt: "2026-09-20T15:00:00Z",
    timezone: "America/Los_Angeles",
    distanceM: 40_000,
    movingS: 5_400,
    elevationM: 600,
    averageWatts: 200,
    powerSource: "measured",
    polyline: null,
    elevationProfile: null,
    photoKeys: [],
    ...overrides,
  };
}

async function detailOf(activity: PublishedActivity) {
  await publishActivity(testStore(db), activity, noClimbNames);
  const detail = await queryRideById(db, activity.activityId);
  if (detail === null) throw new Error("ride not found");
  return toRideDetailWire(detail);
}

describe("rideKey", () => {
  it("reads the id of a ride's page", () => {
    expect(rideKey("/rides/01KX8GTM6RBTZH5J8CEQXEDEBV")).toBe(
      "01KX8GTM6RBTZH5J8CEQXEDEBV",
    );
  });

  it("is null for the list and for paths beneath a ride", () => {
    expect(rideKey("/rides")).toBeNull();
    expect(rideKey("/rides/abc/photos")).toBeNull();
  });

  it("refuses an id no ride could carry", () => {
    expect(rideKey("/rides/abc.json")).toBeNull();
    expect(rideKey("/rides/%3Cscript%3E")).toBeNull();
  });
});

describe("rideDetailUrl", () => {
  it("sits beside the ride's page", () => {
    expect(rideDetailUrl("abc")).toBe("/rides/abc.json");
  });
});

describe("toRideDetailWire", () => {
  it("carries the figures raw, for the units the list is showing", async () => {
    const wire = await detailOf(
      ride("one", { polyline: GOOGLE_EXAMPLE, description: "Tam loop" }),
    );

    expect(wire).toMatchObject({
      id: "one",
      name: "Ride one",
      route: GOOGLE_EXAMPLE,
      description: "Tam loop",
      distanceM: 40_000,
      elevationM: 600,
      movingS: 5_400,
      averageWatts: 200,
    });
  });

  it("gives each shot the preview its own view draws", async () => {
    const wire = await detailOf(ride("shots", { photoKeys: ["a/one.jpg"] }));

    expect(wire.media).toHaveLength(1);
    expect(wire.media[0]?.previewUrl).toMatch(
      /^\/photos\/previews\/.+a\/one\.jpg$/,
    );
  });

  it("leaves out a map and a Strava link the ride doesn't have", async () => {
    const wire = await detailOf(ride("bare", { stravaId: null }));

    expect(wire).not.toHaveProperty("route");
    expect(wire).not.toHaveProperty("stravaUrl");
  });

  it("survives the trip through JSON and the browser's schema", async () => {
    const wire = await detailOf(
      ride("trip", { polyline: GOOGLE_EXAMPLE, photoKeys: ["b/two.mp4"] }),
    );

    const received: unknown = await Response.json(wire).json();

    expect(rideDetailWire.parse(received)).toEqual(wire);
  });

  it("is refused by the schema when a field is the wrong shape", () => {
    expect(rideDetailWire.safeParse({ id: "x", name: 3 }).success).toBe(false);
  });
});
