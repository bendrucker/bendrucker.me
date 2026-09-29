// A route leads with five highlights on a desktop and three on a phone. The
// server can't know the width it renders for, so it ships all five and hides
// the last two below the desktop breakpoint, and the list below repeats them
// for a phone alone.

export const HIGHLIGHTS = { phone: 3, desktop: 5 } as const;

/** A shelf of posters or records names its art only when tapped on a phone, so it fits four. */
export const SHELF_PHONE = 4;

/** Whether the highlight at this index shows only from the desktop breakpoint up. */
export function desktopOnly(
  index: number,
  phone: number = HIGHLIGHTS.phone,
): boolean {
  return index >= phone;
}

export interface HighlightSplit<T> {
  highlights: (T & { desktopOnly: boolean })[];
  /** The rows a phone's highlights leave, marking those a desktop leads with. */
  rest: (T & { phoneOnly: boolean })[];
}

/**
 * Splits the rows around their highlights, which must be drawn from the same
 * row objects, since a row is matched to its highlight by identity.
 */
export function splitHighlights<T extends object>(
  rows: readonly T[],
  ranked: readonly T[],
  phone: number = HIGHLIGHTS.phone,
): HighlightSplit<T> {
  const top = ranked.slice(0, HIGHLIGHTS.desktop);
  const onPhone = new Set(top.slice(0, phone));
  const onDesktop = new Set(top);
  return {
    highlights: top.map((row, i) => ({
      ...row,
      desktopOnly: desktopOnly(i, phone),
    })),
    rest: rows
      .filter((row) => !onPhone.has(row))
      .map((row) => ({ ...row, phoneOnly: onDesktop.has(row) })),
  };
}
