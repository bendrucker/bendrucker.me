import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import { queryCyclingLogPage } from "./feed";
import type { LogPage } from "./types";
import { logPage } from "./log-page";
import { publishActivity, type PublishedActivity } from "./publish";
import type { ActivityStore } from "./store";
import type { z } from "zod";

/** Google's documented polyline example. */
const GOOGLE_EXAMPLE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
});

function ride(
  activityId: string,
  overrides: Partial<PublishedActivity> = {},
): PublishedActivity {
  return {
    activityId,
    stravaId: activityId,
    name: `Ride ${activityId}`,
    sport: "ride",
    startedAt: "2026-03-11T13:00:55Z",
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

describe("logPage", () => {
  // `satisfies z.ZodType<LogPage>` on the schema covers the direction where the
  // schema produces something the type will not accept. This covers the other:
  // a field the type carries that the schema quietly stopped describing.
  it("infers the type the endpoint returns", () => {
    expectTypeOf<z.infer<typeof logPage>>().toEqualTypeOf<LogPage>();
  });

  it("round trips a real page through JSON", async () => {
    await publishActivity(
      store,
      ride("a", {
        polyline: GOOGLE_EXAMPLE,
        elevationProfile: [1, 2, 3],
        photoKeys: ["raw/strava/activities/1/photos/one.jpg"],
      }),
    );
    await publishActivity(
      store,
      ride("b", { startedAt: "2026-02-14T13:00:55Z", distanceM: 90_000 }),
    );
    await publishActivity(
      store,
      ride("c", { startedAt: "2025-06-14T13:00:55Z" }),
    );

    const page = await queryCyclingLogPage(db, "2026-04");

    expect(page.months.flatMap((month) => month.rides)).not.toHaveLength(0);
    expect(page.logCursor).toBe("2025-07");
    const wire: unknown = await Response.json(page).json();
    expect(logPage.parse(wire)).toEqual(page);
  });

  it("rejects a payload missing the cursor", () => {
    expect(logPage.safeParse({ months: [] }).success).toBe(false);
  });
});
