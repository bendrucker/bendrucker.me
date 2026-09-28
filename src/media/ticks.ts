/** The most ticks a season draws. Past this, a tick covers several episodes. */
export const TICK_MAX = 12;

/**
 * A season's episodes as ticks, each the share of its episodes watched. Up to
 * twelve episodes get a tick each. A longer season spreads them so no more
 * than twelve are drawn, and a tick covering several fills by the share of
 * those watched.
 */
export function episodeTicks(watched: number, aired: number): number[] {
  if (aired <= 0) return [];
  const per = Math.ceil(aired / TICK_MAX);
  const count = Math.ceil(aired / per);
  return Array.from({ length: count }, (_, i) => {
    const size = Math.min(per, aired - i * per);
    const seen = Math.max(0, Math.min(size, watched - i * per));
    return seen / size;
  });
}

/** A tick's fill: the category color across the watched share, faint past it. */
export function tickBackground(fraction: number): string {
  const on = "var(--cat)";
  const off = "color-mix(in srgb, var(--cat) 20%, transparent)";
  if (fraction >= 1) return on;
  if (fraction <= 0) return off;
  return `linear-gradient(90deg, ${on} ${Math.round(fraction * 100)}%, ${off} 0)`;
}

export function tickLabel(watched: number, aired: number): string {
  return `${Math.min(watched, aired)} of ${aired} episodes watched`;
}
