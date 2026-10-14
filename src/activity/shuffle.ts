/**
 * The home shelf's order changes once a day. The server computes it from the
 * UTC day, so the page it renders and the island hydrating it agree, and a
 * cached page stays right until UTC midnight.
 */

/** The UTC calendar day, `YYYY-MM-DD`, that seeds the day's order. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Seconds left in the UTC day: the most a page carrying the order may be cached. */
export function secondsUntilUtcMidnight(now: Date): number {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(0, Math.floor((midnight - now.getTime()) / 1000));
}

/** FNV-1a: a stable 32-bit hash of the seed string. */
function hash(seed: string): number {
  let h = 0x81_1c_9d_c5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01_00_01_93);
  }
  return h >>> 0;
}

/** mulberry32: a small generator that gives the same sequence for the same seed. */
function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** A Fisher-Yates shuffle driven by the seed. The input is left as it was. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const next = generator(hash(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** The day's order: the same all UTC day, and a new one after midnight. */
export function dayShuffle<T>(items: readonly T[], now: Date): T[] {
  return seededShuffle(items, utcDay(now));
}
