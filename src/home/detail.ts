// The home page opens a ride or a code item over its cards, in the same modal
// the lists use. A page holds one modal, which answers history for it, so the
// two kinds share one parameter and a key that says which kind it names.
import {
  codeKey,
  codePageHref,
  fetchCodeDetail,
  type CodeDetail,
} from "@/code/detailWire";
import { fetchRideDetail, rideKey, type RideDetailWire } from "@/rides/detail";
import { rideHref } from "@/rides/links";

/** The query parameter the home page names an open item under. */
export const HOME_PARAM = "open";

export type HomeDetail =
  { kind: "ride"; ride: RideDetailWire } | { kind: "code"; detail: CodeDetail };

export type HomeKey =
  { kind: "ride"; id: string } | { kind: "code"; key: string };

/** `ride/<id>` or `code/<key>`, the key a home row's path opens under, or null. */
export function homeKey(pathname: string): string | null {
  const ride = rideKey(pathname);
  if (ride !== null) return `ride/${ride}`;
  const code = codeKey(pathname);
  return code === null ? null : `code/${code}`;
}

export function parseHomeKey(key: string): HomeKey | null {
  if (key.startsWith("ride/")) return { kind: "ride", id: key.slice(5) };
  if (key.startsWith("code/")) return { kind: "code", key: key.slice(5) };
  return null;
}

/** The item's own page. */
export function homeFullHref(key: string): string | undefined {
  const parsed = parseHomeKey(key);
  if (parsed === null) return undefined;
  return parsed.kind === "ride"
    ? rideHref(parsed.id, "imperial")
    : codePageHref(parsed.key);
}

export async function fetchHomeDetail(key: string): Promise<HomeDetail> {
  const parsed = parseHomeKey(key);
  if (parsed === null) throw new Error(`Not a home item: ${key}`);
  if (parsed.kind === "ride") {
    return { kind: "ride", ride: await fetchRideDetail(parsed.id) };
  }
  return { kind: "code", detail: await fetchCodeDetail(parsed.key) };
}
