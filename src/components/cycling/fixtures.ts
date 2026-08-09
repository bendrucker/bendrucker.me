import { seededRandom, syntheticProfile } from "./profile";
import type {
  Coordinate,
  Highlight,
  HighlightMonth,
  MonthGroup,
  PowerBest,
  RankedList,
  Ride,
  RidePhoto,
} from "./types";

const MARIN: Coordinate = [37.8991, -122.5253];
const NAPA: Coordinate = [38.5025, -122.2654];
const PENINSULA: Coordinate = [37.4419, -122.143];

/**
 * Closed loop with a few harmonics layered on, so fixture routes read as roads
 * rather than circles. Latitude is compressed by the cosine of the centre so
 * the loop keeps its proportions once projected.
 */
function syntheticRoute(
  seed: string,
  center: Coordinate,
  radiusDegrees: number,
  points = 220,
): Coordinate[] {
  const random = seededRandom(seed);
  const harmonics = Array.from({ length: 4 }, (_, index) => ({
    frequency: index + 2,
    amplitude: (random() * 0.5 + 0.15) / (index + 1),
    phase: random() * Math.PI * 2,
  }));
  const lonScale = 1 / Math.cos((center[0] * Math.PI) / 180);

  return Array.from({ length: points }, (_, index) => {
    const angle = (index / (points - 1)) * Math.PI * 2;
    const wobble = harmonics.reduce(
      (sum, h) => sum + h.amplitude * Math.sin(h.frequency * angle + h.phase),
      0,
    );
    const radius = radiusDegrees * (1 + wobble * 0.45);
    return [
      center[0] + radius * Math.sin(angle),
      center[1] + radius * Math.cos(angle) * lonScale,
    ] satisfies Coordinate;
  });
}

function photos(rideId: string, count: number): RidePhoto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${rideId}-${index}`,
    thumbnailUrl: `https://picsum.photos/seed/${rideId}-${index}/240/240`,
    fullUrl: `https://picsum.photos/seed/${rideId}-${index}/1200/800`,
    alt: `Roadside view from the ride, photo ${index + 1}`,
  }));
}

function ride(
  overrides: Omit<Ride, "photos" | "badges" | "facts" | "elevationProfile"> &
    Partial<Pick<Ride, "photos" | "badges" | "facts" | "elevationProfile">>,
): Ride {
  return {
    photos: [],
    badges: [],
    facts: [],
    elevationProfile: syntheticProfile(
      overrides.id,
      overrides.elevationFt / overrides.distanceMi,
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
  photos: photos("19275831643", 3),
  badges: [
    { kind: "longest", label: "→ longest" },
    { kind: "new-climb", label: "✦ new climb · atlas peak" },
  ],
  facts: [
    { id: "climb", label: "▲ 3,204 ft climb · 8.4%" },
    { id: "cal", label: "◉ 4,820 cal" },
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
  photos: photos("18582680583", 1),
  badges: [{ kind: "race", label: "★ race" }],
  facts: [{ id: "fast", label: "» fastest avg · 21.4 mph" }],
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
  photos: photos("19170862418", 5),
  badges: [
    { kind: "new-location", label: "✈ new location" },
    { kind: "most-climbing", label: "▲ most climbing" },
  ],
  facts: [{ id: "cal", label: "◉ 6,140 cal" }],
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

/** Long name plus a full set of annotations, for overflow and wrapping. */
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
  photos: photos("19090081916", 4),
  badges: [
    { kind: "new-climb", label: "✦ new climb · mount vision" },
    { kind: "longest", label: "→ longest" },
    { kind: "race", label: "★ race" },
  ],
  facts: [
    { id: "climb", label: "▲ 1,890 ft climb · 6.1%" },
    { id: "fast", label: "» fastest avg · 17.8 mph" },
    { id: "cal", label: "◉ 3,120 cal" },
  ],
});

export const rides: Ride[] = [
  epicRide,
  travelRide,
  crowdedRide,
  everydayRide,
  raceRide,
  bareRide,
];

export const julyMonth: MonthGroup = {
  key: "2026-07",
  label: "july 2026",
  rides: [epicRide, travelRide, everydayRide],
  distanceMi: 357.57,
  elevationFt: 35151,
  rideCount: 19,
  commuteCount: 6,
};

export const juneMonth: MonthGroup = {
  key: "2026-06",
  label: "june 2026",
  rides: [crowdedRide],
  distanceMi: 289.4,
  elevationFt: 24880,
  rideCount: 22,
  commuteCount: 9,
};

export const mayMonth: MonthGroup = {
  key: "2026-05",
  label: "may 2026",
  rides: [raceRide, bareRide],
  distanceMi: 214.6,
  elevationFt: 16404,
  rideCount: 14,
  commuteCount: 0,
};

export const months: MonthGroup[] = [julyMonth, juneMonth, mayMonth];

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

export const powerBests: PowerBest[] = [
  { id: "1m", label: "1 min", watts: null },
  { id: "5m", label: "5 min", watts: null },
  { id: "20m", label: "20 min", watts: null },
  { id: "1h", label: "1 hr", watts: null },
  { id: "ride", label: "ride avg", watts: 288 },
];

export const rankedLists: RankedList[] = [
  {
    id: "distance",
    title: "→ longest rides",
    metric: "distance",
    rows: [
      {
        id: travelRide.id,
        name: "Atlas",
        detail: "'26",
        value: 195.61,
        href: travelRide.stravaUrl,
      },
      {
        id: epicRide.id,
        name: "Friends of Tam",
        detail: "'26",
        value: 138.71,
        href: epicRide.stravaUrl,
      },
      {
        id: "19002606448",
        name: "Pescadero",
        detail: "'26",
        value: 99.46,
        href: strava("19002606448"),
      },
    ],
  },
  {
    id: "elevation",
    title: "▲ most climbing",
    metric: "elevation",
    rows: [
      { id: epicRide.id, name: "Friends of Tam", detail: "'26", value: 18100 },
      { id: travelRide.id, name: "Atlas", detail: "'26", value: 14626 },
      { id: "18818286756", name: "Tam Day", detail: "'26", value: 7201 },
    ],
  },
  {
    id: "duration",
    title: "⏱ longest days",
    metric: "duration",
    rows: [
      {
        id: travelRide.id,
        name: "Atlas",
        detail: "'26 · 168 W",
        value: 46219,
      },
      {
        id: epicRide.id,
        name: "Friends of Tam",
        detail: "'26 · 194 W",
        value: 39991,
      },
      { id: "19002606448", name: "Pescadero", detail: "'26", value: 21197 },
    ],
  },
  {
    id: "climbs",
    title: "▲ largest climbs",
    metric: "elevation",
    rows: [
      { id: "atlas-peak", name: "Atlas Peak", detail: "6.2%", value: 3204 },
      { id: "mt-tam", name: "Mount Tamalpais", detail: "5.8%", value: 2571 },
      { id: "mt-vision", name: "Mount Vision", detail: "6.1%", value: 1890 },
    ],
  },
  {
    id: "efforts",
    title: "⏱ best efforts",
    metric: "clock",
    rows: [
      { id: "40k", name: "40k", value: 4320 },
      { id: "20-mile", name: "20 mile", value: 3468 },
      { id: "10k", name: "10k", value: 1002 },
      { id: "1-mile", name: "1 mile", value: 148 },
    ],
  },
];

export const prYears = ["all", "2026", "2025"];
