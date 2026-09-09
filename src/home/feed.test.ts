import { describe, expect, it } from "vitest";
import type { Repo, Ride } from "@/activity/types";
import { formatFeedDate, mergeRecent } from "./feed";

function ride(id: string, startedAt: string): Ride {
  return {
    id,
    name: `Ride ${id}`,
    startedAt,
    media: [],
    badges: [],
    facts: [],
  };
}

function repo(name: string, lastActivity: string): Repo {
  return {
    name,
    owner: "bendrucker",
    description: "",
    url: `https://github.com/bendrucker/${name}`,
    primaryLanguage: null,
    stargazerCount: 0,
    createdAt: null,
    lastActivity,
    activitySummary: {
      prCount: 0,
      reviewCount: 0,
      issueCount: 0,
      mergeCount: 0,
      hasMergedPRs: false,
    },
    years: [2026],
  };
}

describe("mergeRecent", () => {
  it("interleaves rides and repos newest first", () => {
    const rides = [
      ride("r1", "2026-03-10T08:00:00"),
      ride("r2", "2026-03-08T08:00:00"),
    ];
    const repos = [
      repo("newest-repo", "2026-03-09T12:00:00Z"),
      repo("oldest-repo", "2026-03-07T12:00:00Z"),
    ];

    const feed = mergeRecent(rides, repos);

    expect(
      feed.map((item) =>
        item.kind === "ride" ? item.ride.id : item.repo.name,
      ),
    ).toEqual(["r1", "newest-repo", "r2", "oldest-repo"]);
  });
});

describe("formatFeedDate", () => {
  const now = new Date("2026-03-15T12:00:00Z");

  it("omits the year for the current year", () => {
    expect(formatFeedDate(new Date("2026-03-10T08:00:00"), now)).toBe("Mar 10");
  });

  it("includes the year for a past one", () => {
    expect(formatFeedDate(new Date("2024-11-02T08:00:00"), now)).toBe(
      "Nov 2, 2024",
    );
  });
});
