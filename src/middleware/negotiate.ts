export const PRODUCES = ["text/html", "text/markdown"] as const;

type AcceptEntry = {
  type: string;
  subtype: string;
  q: number;
  specificity: 0 | 1 | 2;
};

function parseEntry(part: string): AcceptEntry | null {
  const [mediaRange, ...paramParts] = part.split(";").map((s) => s.trim());
  const [type, subtype] = mediaRange.split("/");
  if (!type || !subtype) return null;

  let q = 1;
  for (const param of paramParts) {
    const [k, v] = param.split("=").map((s) => s.trim());
    if (k !== "q" || v === undefined) continue;
    const parsed = Number.parseFloat(v);
    if (Number.isFinite(parsed)) {
      q = Math.max(0, Math.min(1, parsed));
    }
  }

  const specificity =
    type === "*" && subtype === "*" ? 0 : subtype === "*" ? 1 : 2;

  return { type, subtype, q, specificity };
}

function parseAccept(header: string): AcceptEntry[] {
  return header
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(parseEntry)
    .filter((entry): entry is AcceptEntry => entry !== null);
}

function matches(candidate: string, entry: AcceptEntry): boolean {
  const [type, subtype] = candidate.split("/");
  if (entry.type === "*" && entry.subtype === "*") return true;
  if (entry.subtype === "*") return entry.type === type;
  return entry.type === type && entry.subtype === subtype;
}

export function negotiate(
  acceptHeader: string | null,
  produces: readonly string[],
): string | null {
  if (produces.length === 0) return null;
  if (!acceptHeader || acceptHeader.trim() === "") return produces[0];

  const entries = parseAccept(acceptHeader);
  if (entries.length === 0) return produces[0];

  type Best = { candidate: string; q: number; index: number };
  let best: Best | null = null;

  for (const [index, candidate] of produces.entries()) {
    const matching = entries.filter((e) => matches(candidate, e));
    if (matching.length === 0) continue;

    const mostSpecific = matching.reduce((a, b) =>
      b.specificity > a.specificity ? b : a,
    );
    if (mostSpecific.q === 0) continue;

    if (
      best === null ||
      mostSpecific.q > best.q ||
      (mostSpecific.q === best.q && index < best.index)
    ) {
      best = { candidate, q: mostSpecific.q, index };
    }
  }

  return best ? best.candidate : null;
}
