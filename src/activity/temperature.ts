// A ride's temperature range from the head unit's own sensor. The sensor sits
// on the bars, so a bike left outside a shop in the sun reads 40°C and more
// for as long as it stands there, then carries that heat for a few minutes
// after the ride resumes. A plain min and max would report that as the day's
// high.
//
// Two cuts answer it. Samples below walking pace are dropped, which removes the
// parked spike itself: the sensor only reads the air once air is moving over
// it. The range is then the 5th to 95th percentile of what remains, which
// trims the cool-down tail after a stop, as long as it lasts under a twentieth
// of the moving time (nine minutes of a three-hour ride). A jump filter would
// catch the spike's leading edge but not its slow decay, and a real descent
// into a cold valley jumps too.

/** A temperature in degrees Celsius and the speed in metres per second at that moment. */
export type TemperatureSample = readonly [
  temperatureC: number,
  speedMps: number,
];

export interface TemperatureRange {
  lowC: number;
  highC: number;
}

/** 2.5 m/s is 9 km/h: faster than walking the bike, slower than any riding. */
export const MOVING_SPEED_MPS = 2.5;

const LOW_PERCENTILE = 0.05;
const HIGH_PERCENTILE = 0.95;

/**
 * Below this many moving samples the percentiles are the extremes by another
 * name, and a range is better left unsaid.
 */
const MIN_MOVING_SAMPLES = 20;

/**
 * The moving temperature range to a tenth of a degree, or null when the ride
 * logged too little moving temperature to trust.
 */
export function temperatureRange(
  samples: readonly TemperatureSample[],
): TemperatureRange | null {
  const moving = samples
    .filter(
      ([temperature, speed]) =>
        Number.isFinite(temperature) && speed >= MOVING_SPEED_MPS,
    )
    .map(([temperature]) => temperature)
    .toSorted((a, b) => a - b);
  if (moving.length < MIN_MOVING_SAMPLES) return null;
  return {
    lowC: tenth(percentile(moving, LOW_PERCENTILE)),
    highC: tenth(percentile(moving, HIGH_PERCENTILE)),
  };
}

/** Nearest-rank percentile, so the result is always a reading the sensor gave. */
function percentile(sorted: readonly number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, index)] ?? Number.NaN;
}

function tenth(value: number): number {
  return Math.round(value * 10) / 10;
}
