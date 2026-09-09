import { describe, expect, test } from "vitest";
import type { Ride } from "@/activity/types";
import { rideTraits } from "./character";

function makeRide(overrides: Partial<Ride> = {}): Ride {
  return {
    id: "r1",
    name: "Evening Ride",
    startedAt: "2026-09-06T17:00:00",
    distanceMi: 18,
    elevationFt: 600,
    media: [],
    badges: [],
    facts: [],
    ...overrides,
  };
}

describe("rideTraits", () => {
  test.each<{ name: string; ride: Ride; expected: string[] }>([
    { name: "an ordinary ride", ride: makeRide(), expected: [] },
    {
      name: "a race by name",
      ride: makeRide({ name: "Berkeley Hills Road Race" }),
      expected: ["race"],
    },
    {
      name: "a time trial by abbreviation",
      ride: makeRide({ name: "SFCC Race: TTT" }),
      expected: ["race"],
    },
    {
      name: "a race by badge",
      ride: makeRide({
        badges: [{ kind: "race", icon: "flag", label: "race" }],
      }),
      expected: ["race"],
    },
    {
      name: "a long flat ride",
      ride: makeRide({ name: "Bay Trail", distanceMi: 62, elevationFt: 800 }),
      expected: ["long"],
    },
    {
      name: "a short hilly ride",
      ride: makeRide({ distanceMi: 35, elevationFt: 3600 }),
      expected: ["hilly"],
    },
    {
      name: "a long hilly race",
      ride: makeRide({
        name: "Mount Tam Hill Climb Race",
        distanceMi: 90,
        elevationFt: 9000,
      }),
      expected: ["race", "long", "hilly"],
    },
    {
      name: "a ride with no measurements",
      ride: makeRide({ distanceMi: undefined, elevationFt: undefined }),
      expected: [],
    },
    {
      name: "a word that only contains race",
      ride: makeRide({ name: "Embarcadero to Bracewell" }),
      expected: [],
    },
  ])("$name", ({ ride, expected }) => {
    expect(rideTraits(ride).map((trait) => trait.kind)).toEqual(expected);
  });
});
