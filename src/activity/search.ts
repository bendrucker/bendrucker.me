/**
 * A route's search. The filter reads a row's title, description, org, and
 * note. Marking covers every occurrence in every field a row renders, so a row
 * that matched only through a field it doesn't show appears unmarked.
 */

export interface Searchable {
  title: string;
  text?: string;
  org?: string;
  note?: string;
}

export interface MarkPart {
  text: string;
  hit: boolean;
}

/**
 * The class a match's `<mark>` takes, shared by `MarkedText` and Writing's
 * script so a match looks the same typed as loaded. The text takes the
 * foreground rather than inheriting, since a description's dim text falls
 * under 4.5:1 against the tint.
 */
export const MARK_CLASS =
  "-mx-px rounded-[3px] bg-cat/24 px-px text-foreground";

/**
 * Escapes what a pattern reads as syntax outside a character class. Under the
 * `u` flag, escaping anything else, like `-`, is itself a syntax error.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, String.raw`\$&`);
}

/**
 * The query as a case-insensitive pattern, or `undefined` when there is
 * nothing to search for. Matching by pattern rather than by lowercased index
 * keeps offsets right for letters whose lowercase is a different length.
 */
function pattern(query: string, flags = "iu"): RegExp | undefined {
  const trimmed = query.trim();
  if (!trimmed) return undefined;
  return new RegExp(escapeRegExp(trimmed), flags);
}

/** Whether a row survives the query. An empty query keeps everything. */
export function matches(item: Searchable, query: string): boolean {
  const re = pattern(query);
  if (!re) return true;
  return [item.title, item.text, item.org, item.note].some(
    (field) => field !== undefined && re.test(field),
  );
}

/** A field split around every occurrence of the query, for `<mark>`. */
export function markParts(text: string, query: string): MarkPart[] {
  const re = pattern(query, "giu");
  if (!re || !text) return text ? [{ text, hit: false }] : [];

  const parts: MarkPart[] = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index;
    if (start > last) parts.push({ text: text.slice(last, start), hit: false });
    parts.push({ text: match[0], hit: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}
