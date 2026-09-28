import { describe, expect, it } from "vitest";
import type { RideDetail } from "@/activity/feed";
import type { Ride } from "@/activity/types";
import { CODE_ROWS } from "@/components/code/fixtures";
import type { CodeRepo, PullRow } from "@/code/types";
import type { RideRow } from "@/rides/rows";
import type { HomeCard } from "./cards";
import { codeFeature, rideFeature, withoutFeatured } from "./features";

const RIDE: RideRow = {
  id: "r1",
  name: "Friends of Tam",
  day: "2026-09-20",
  distanceM: 224_000,
  climbM: 5_500,
};

function detail(ride: Pick<Ride, "route" | "media">): RideDetail {
  return {
    ride: {
      id: "r1",
      name: "Friends of Tam",
      startedAt: "",
      badges: [],
      facts: [],
      ...ride,
    },
    distanceM: 224_000,
    elevationM: 5_500,
    movingS: null,
    averageWatts: null,
    normalizedWatts: null,
    averageHeartRate: null,
    temperatureLowC: null,
    temperatureHighC: null,
    description: null,
  };
}

function pull(
  key: string,
  title: string,
  createdAt: string,
  overrides: Partial<PullRow> = {},
): PullRow {
  return {
    id: `${key}#${title}`,
    repo: key,
    number: 1,
    title,
    url: "",
    state: "MERGED",
    isDraft: false,
    createdAt,
    mergedAt: null,
    additions: 0,
    deletions: 0,
    reactions: 0,
    ...overrides,
  };
}

function repo(key: string, pulls: PullRow[]): CodeRepo {
  const [owner = "", name = ""] = key.split("/");
  return {
    repo: key,
    owner,
    name,
    description: "",
    url: "",
    language: null,
    stars: 0,
    lastActivity: "2026-09-20T00:00:00Z",
    mine: owner === "bendrucker",
    pulls,
    issues: [],
  };
}

describe("rideFeature", () => {
  it("carries the track and the first photo, passing over videos", () => {
    const feature = rideFeature(
      RIDE,
      detail({
        route: "abc",
        media: [
          {
            id: "v.mp4",
            kind: "video",
            thumbnailUrl: "/t/v",
            fullUrl: "",
            alt: "Video 1",
          },
          {
            id: "p.jpg",
            kind: "photo",
            thumbnailUrl: "/t/p",
            fullUrl: "",
            alt: "Photo 2",
          },
        ],
      }),
    );
    expect(feature).toEqual({
      ride: RIDE,
      route: "abc",
      photo: { url: "/t/p", alt: "Photo 2" },
    });
  });

  it("keeps the name and figures when the detail failed to load", () => {
    expect(rideFeature(RIDE, null)).toEqual({
      ride: RIDE,
      route: undefined,
      photo: undefined,
    });
  });
});

describe("codeFeature", () => {
  const [row] = CODE_ROWS;
  if (row === undefined) throw new Error("fixture missing");

  it("names the newest pull request that is open or merged", () => {
    const repos = [
      repo(row.key, [
        pull(row.key, "Draft", "2026-09-25", { isDraft: true, state: "OPEN" }),
        pull(row.key, "Abandoned", "2026-09-24", { state: "CLOSED" }),
        pull(row.key, "Landed", "2026-09-22"),
        pull(row.key, "Older", "2026-09-10"),
      ]),
      repo("someone/else", [pull("someone/else", "Elsewhere", "2026-09-26")]),
    ];
    expect(codeFeature(row, repos).latest).toBe("Landed");
  });

  it("reads across a project's repositories", () => {
    const project = CODE_ROWS.find((candidate) => candidate.members.length > 1);
    if (project === undefined) throw new Error("fixture missing");
    const [first, second] = project.members;
    if (first === undefined || second === undefined) {
      throw new Error("fixture missing");
    }
    const repos = [
      repo(first.key, [pull(first.key, "First", "2026-09-10")]),
      repo(second.key, [pull(second.key, "Second", "2026-09-18")]),
    ];
    expect(codeFeature(project, repos).latest).toBe("Second");
  });

  it("leaves the fact out when nothing landed", () => {
    expect(codeFeature(row, []).latest).toBeUndefined();
  });
});

describe("withoutFeatured", () => {
  const rides: HomeCard = { id: "rides", items: [RIDE, { ...RIDE, id: "r2" }] };
  const code: HomeCard = { id: "code", items: CODE_ROWS.slice(0, 3) };

  it("drops each featured item from its card's rows", () => {
    const [top] = CODE_ROWS;
    if (top === undefined) throw new Error("fixture missing");
    const [rideCard, codeCard] = withoutFeatured([rides, code], {
      rides: { ride: RIDE },
      code: { row: top },
    });
    expect(rideCard).toEqual({ id: "rides", items: [{ ...RIDE, id: "r2" }] });
    expect(codeCard).toEqual({ id: "code", items: CODE_ROWS.slice(1, 3) });
  });

  it("keeps every row of a card without a feature", () => {
    const [rideCard] = withoutFeatured([rides], {});
    expect(rideCard?.items).toHaveLength(2);
  });
});
