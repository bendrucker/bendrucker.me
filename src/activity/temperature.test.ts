import { describe, expect, it } from "vitest";
import { temperatureRange, type TemperatureSample } from "./temperature";

const RIDING = 7;

/** A steady ride warming from `from` to `to` across `count` moving samples. */
function riding(count: number, from: number, to: number): TemperatureSample[] {
  return Array.from({ length: count }, (_, index) => [
    from + ((to - from) * index) / (count - 1),
    RIDING,
  ]);
}

describe("temperatureRange", () => {
  it("reports the spread of a ride with no stops", () => {
    expect(temperatureRange(riding(200, 12, 22))).toEqual({
      lowC: 12.5,
      highC: 21.5,
    });
  });

  it("ignores a bike parked in the sun and the heat it carries back out", () => {
    const samples: TemperatureSample[] = [
      ...riding(120, 14, 20),
      // Twenty minutes outside a shop: the sensor bakes at a standstill.
      ...Array.from({ length: 120 }, (): TemperatureSample => [43, 0]),
      // Wheeling it to the road still reads as parked.
      [41, 1.2],
      [40, 1.8],
      // Riding again, the sensor sheds that heat over a few minutes.
      [38, RIDING],
      [34, RIDING],
      [30, RIDING],
      [27, RIDING],
      [24, RIDING],
      ...riding(120, 20, 22),
    ];

    const range = temperatureRange(samples);
    expect(range).not.toBeNull();
    expect(range?.lowC).toBeGreaterThanOrEqual(14);
    expect(range?.highC).toBeLessThanOrEqual(22);
  });

  it("keeps a real cold descent inside the range", () => {
    const samples: TemperatureSample[] = [
      ...riding(100, 18, 20),
      ...riding(40, 9, 11),
      ...riding(100, 18, 20),
    ];

    expect(temperatureRange(samples)?.lowC).toBeLessThan(11);
  });

  it("says nothing for a ride with too little moving temperature", () => {
    expect(temperatureRange(riding(10, 15, 16))).toBeNull();
    expect(
      temperatureRange(
        Array.from({ length: 300 }, (): TemperatureSample => [20, 0]),
      ),
    ).toBeNull();
  });
});
