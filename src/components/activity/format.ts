/** A star count sized for a label: `842`, then `1.2k` past a thousand. */
export function formatStarCount(count: number): string {
  if (count < 1000) return count.toString();
  const thousands = Math.floor(count / 100) / 10;
  return `${thousands}k`;
}
