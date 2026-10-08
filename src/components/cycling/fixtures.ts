import { encodeProfile } from "@/activity/track";
import { MARIN, NAPA, PENINSULA, syntheticRoute } from "@/test/rides";
import { relief, syntheticProfile } from "./profile";
import type {
  CyclingActivityData,
  Highlight,
  HighlightMonth,
  MonthGroup,
  Ride,
  RideMedia,
} from "@/activity/types";

function photos(rideId: string, count: number): RideMedia[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${rideId}-${index}`,
    kind: "photo",
    thumbnailUrl: `https://picsum.photos/seed/${rideId}-${index}/240/240`,
    fullUrl: `https://picsum.photos/seed/${rideId}-${index}/1200/800`,
    alt: `Roadside view from the ride, photo ${index + 1}`,
  }));
}

/**
 * The stories run without a worker, so a video's poster is a still from the
 * same series as the photos. The MP4 is MDN's CC0 sample, served over a host
 * that answers `Range`, which is what the carousel's scrubber needs.
 */
function video(rideId: string, index: number): RideMedia {
  return {
    id: `${rideId}-video`,
    kind: "video",
    thumbnailUrl: `https://picsum.photos/seed/${rideId}-video/240/240`,
    fullUrl: "https://mdn.github.io/shared-assets/videos/flower.mp4",
    alt: `Video ${index + 1} from the ride`,
  };
}

function ride(
  overrides: Omit<Ride, "media" | "badges" | "facts" | "elevationProfile"> &
    Partial<Pick<Ride, "media" | "badges" | "facts" | "elevationProfile">>,
): Ride {
  return {
    media: [],
    badges: [],
    facts: [],
    elevationProfile: encodeProfile(
      syntheticProfile(overrides.id, relief(overrides.elevationFt)),
    ),
    ...overrides,
  };
}

const strava = (id: string) => `https://www.strava.com/activities/${id}`;

export const epicRide: Ride = ride({
  id: "19275831643",
  name: "Friends of Tam",
  stravaUrl: strava("19275831643"),
  startedAt: "2026-07-11T05:00:55",
  distanceMi: 138.71,
  elevationFt: 18100,
  movingSeconds: 39991,
  averageWatts: 194,
  companionCount: 5,
  route: syntheticRoute("19275831643", MARIN, 0.16, 260),
  media: photos("19275831643", 3),
  badges: [
    { kind: "longest", icon: "ruler", label: "longest", scope: "jul" },
    { kind: "new-climb", icon: "mountain", label: "atlas peak" },
  ],
  facts: [
    { id: "climb", icon: "trending-up", label: "3,204 ft climb · 8.4%" },
    { id: "cal", icon: "flame", label: "4,820 cal" },
  ],
});

export const everydayRide: Ride = ride({
  id: "19404538650",
  name: "Headlands",
  stravaUrl: strava("19404538650"),
  startedAt: "2026-07-21T06:08:03",
  distanceMi: 23.25,
  elevationFt: 2425,
  movingSeconds: 5930,
  averageWatts: 176,
  route: syntheticRoute("19404538650", MARIN, 0.045),
});

export const raceRide: Ride = ride({
  id: "18582680583",
  name: "SFCC Race 2: TTT 🥇",
  stravaUrl: strava("18582680583"),
  startedAt: "2026-05-20T06:03:11",
  distanceMi: 11.33,
  elevationFt: 253,
  movingSeconds: 2319,
  averageWatts: 288,
  companionCount: 3,
  route: syntheticRoute("18582680583", PENINSULA, 0.03),
  media: photos("18582680583", 1),
  badges: [{ kind: "race", icon: "flag", label: "race" }],
  facts: [{ id: "fast", icon: "gauge", label: "fastest avg · 21.4 mph" }],
});

export const travelRide: Ride = ride({
  id: "19170862418",
  name: "Atlas",
  stravaUrl: strava("19170862418"),
  startedAt: "2026-07-03T04:58:55",
  distanceMi: 195.61,
  elevationFt: 14626,
  movingSeconds: 46219,
  averageWatts: 168,
  companionCount: 2,
  route: syntheticRoute("19170862418", NAPA, 0.2, 260),
  media: [video("19170862418", 0), ...photos("19170862418", 4)],
  badges: [
    { kind: "new-location", icon: "map-pin", label: "new location" },
    {
      kind: "most-climbing",
      icon: "trending-up",
      label: "most climbing",
      scope: "jul",
    },
  ],
  facts: [{ id: "cal", icon: "flame", label: "6,140 cal" }],
});

/** No route, no photos, no annotations. Exercises every empty branch at once. */
export const bareRide: Ride = ride({
  id: "19536737704",
  name: "Evening Ride",
  stravaUrl: strava("19536737704"),
  startedAt: "2026-07-30T18:00:08",
  distanceMi: 4.9,
  elevationFt: 260,
  movingSeconds: 1442,
});

/**
 * Long name, a full set of annotations, and more photos than a strip can
 * show. Exercises the wrapping name and the clipped photo row in one ride.
 */
export const crowdedRide: Ride = ride({
  id: "19090081916",
  name: "SFCC Anniversary Ride: Paradise Loop, Camino Alto, and the long way home",
  stravaUrl: strava("19090081916"),
  startedAt: "2026-06-27T08:03:57",
  distanceMi: 63.19,
  elevationFt: 5459,
  movingSeconds: 14833,
  averageWatts: 201,
  companionCount: 12,
  route: syntheticRoute("19090081916", MARIN, 0.09, 240),
  media: photos("19090081916", 12),
  badges: [
    { kind: "new-climb", icon: "mountain", label: "mount vision" },
    { kind: "longest", icon: "ruler", label: "longest", scope: "jun" },
    { kind: "race", icon: "flag", label: "race" },
  ],
  facts: [
    { id: "climb", icon: "trending-up", label: "1,890 ft climb · 6.1%" },
    { id: "fast", icon: "gauge", label: "fastest avg · 17.8 mph" },
    { id: "cal", icon: "flame", label: "3,120 cal" },
  ],
});

export const springRide: Ride = ride({
  id: "18211405572",
  name: "Old La Honda repeats",
  stravaUrl: strava("18211405572"),
  startedAt: "2026-04-09T07:31:22",
  distanceMi: 32.6,
  elevationFt: 3910,
  movingSeconds: 8455,
  averageWatts: 212,
  route: syntheticRoute("18211405572", PENINSULA, 0.04),
  badges: [{ kind: "new-climb", icon: "mountain", label: "old la honda" }],
  facts: [{ id: "climb", icon: "trending-up", label: "1,290 ft climb · 7.3%" }],
});

export const winterRide: Ride = ride({
  id: "17550120994",
  name: "Paradise Loop",
  stravaUrl: strava("17550120994"),
  startedAt: "2025-12-14T09:12:40",
  distanceMi: 41.8,
  elevationFt: 2180,
  movingSeconds: 9840,
  averageWatts: 165,
  companionCount: 2,
  route: syntheticRoute("17550120994", MARIN, 0.06),
  media: photos("17550120994", 2),
});

export const rides: Ride[] = [
  epicRide,
  travelRide,
  crowdedRide,
  everydayRide,
  raceRide,
  bareRide,
  springRide,
  winterRide,
];

export const julyMonth: MonthGroup = {
  key: "2026-07",
  label: "july 2026",
  rides: [epicRide, travelRide, everydayRide],
  distanceMi: 357.57,
  elevationFt: 35151,
  rideCount: 19,
  commutes: { count: 6, distanceMi: 31.4, movingSeconds: 8_940 },
};

export const juneMonth: MonthGroup = {
  key: "2026-06",
  label: "june 2026",
  rides: [crowdedRide],
  distanceMi: 289.4,
  elevationFt: 24880,
  rideCount: 22,
  commutes: { count: 9, distanceMi: 47.2, movingSeconds: 13_320 },
};

export const mayMonth: MonthGroup = {
  key: "2026-05",
  label: "may 2026",
  rides: [raceRide, bareRide],
  distanceMi: 214.6,
  elevationFt: 16404,
  rideCount: 14,
};

export const aprilMonth: MonthGroup = {
  key: "2026-04",
  label: "april 2026",
  rides: [springRide],
  distanceMi: 176.2,
  elevationFt: 19340,
  rideCount: 11,
  commutes: { count: 4, distanceMi: 20.8, movingSeconds: 5_760 },
};

export const decemberMonth: MonthGroup = {
  key: "2025-12",
  label: "december 2025",
  rides: [winterRide],
  distanceMi: 132.9,
  elevationFt: 8115,
  rideCount: 8,
  commutes: { count: 2, distanceMi: 9.6, movingSeconds: 3_180 },
};

export const months: MonthGroup[] = [
  julyMonth,
  juneMonth,
  mayMonth,
  aprilMonth,
  decemberMonth,
];

export const highlights: Highlight[] = [
  { ride: epicRide, badge: epicRide.badges[0]!, metric: "distance" },
  { ride: travelRide, badge: travelRide.badges[0]!, metric: "elevation" },
  { ride: raceRide, badge: raceRide.badges[0]!, metric: "duration" },
];

export const highlightMonths: HighlightMonth[] = [
  {
    key: julyMonth.key,
    label: julyMonth.label,
    distanceMi: julyMonth.distanceMi,
    elevationFt: julyMonth.elevationFt,
    rideCount: julyMonth.rideCount,
    highlights: highlights.slice(0, 2),
  },
  {
    key: mayMonth.key,
    label: mayMonth.label,
    distanceMi: mayMonth.distanceMi,
    elevationFt: mayMonth.elevationFt,
    rideCount: mayMonth.rideCount,
    highlights: highlights.slice(2),
  },
];

export const activity: CyclingActivityData = {
  totals: {
    year: 2026,
    distanceMi: 4218.4,
    elevationFt: 312905,
    rideCount: 148,
    // The log runs past the year boundary, so the totals say which year they
    // count rather than leaving the December rides below them ambiguous.
  },
  months,
  highlightMonths,
  // The fixtures are one window of the log and nothing older, so there is
  // nothing for a story to page back to.
  logCursor: null,
};
