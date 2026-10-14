import { describe, expect, it } from "vitest";
import { formatDuration, formatTemperatureRange, rideStats } from "./stats";

const EMPTY = {
  distanceM: null,
  elevationM: null,
  movingS: null,
  averageWatts: null,
  normalizedWatts: null,
  averageHeartRate: null,
  temperatureLowC: null,
  temperatureHighC: null,
};

describe("rideStats", () => {
  it("lists every figure, most useful first", () => {
    const stats = rideStats(
      {
        distanceM: 80_467,
        elevationM: 1_200,
        movingS: 12_120,
        averageWatts: 196.6,
        normalizedWatts: 224,
        averageHeartRate: 141.5,
        temperatureLowC: 12,
        temperatureHighC: 23.5,
      },
      "imperial",
      true,
    );

    expect(stats).toEqual([
      { value: "50", unit: "mi", label: "distance" },
      { value: "3,937", unit: "ft", label: "climbing", icon: "mountain" },
      { value: "3:22", label: "moving time" },
      { value: "197", unit: "W", label: "average power" },
      { value: "224", unit: "W", label: "normalized power" },
      { value: "142", unit: "bpm", label: "average heart rate" },
      { value: "54–74", unit: "°F", label: "temperature" },
    ]);
  });

  it("leaves out what the ride has no data for", () => {
    const stats = rideStats(
      { ...EMPTY, distanceM: 20_000, movingS: 3_600, averageHeartRate: 120 },
      "metric",
      false,
    );

    expect(stats.map((stat) => stat.label)).toEqual([
      "distance",
      "moving time",
      "average heart rate",
    ]);
  });

  it("needs both ends of the temperature range", () => {
    expect(
      rideStats({ ...EMPTY, temperatureLowC: 10 }, "imperial", false),
    ).toEqual([]);
  });
});

describe("formatDuration", () => {
  it.each([
    [59 * 60, "0:59"],
    [3_600, "1:00"],
    [34_920, "9:42"],
    [3_599.6, "1:00"],
  ])("formats %d seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatTemperatureRange", () => {
  it("converts to Fahrenheit for imperial", () => {
    expect(formatTemperatureRange(10, 20, "imperial")).toBe("50–68");
  });

  it("collapses a range that rounds to one figure", () => {
    expect(formatTemperatureRange(18.2, 18.4, "metric")).toBe("18");
  });
});
