// The Rides route's URLs. Every filter is a query parameter the server renders,
// so a link carries the state a reader left the list in, and a default is left
// out rather than spelled.
import type { Units } from "@/components/cycling/types";

export const RIDE_VIEWS = ["log", "records"] as const;

export type RideView = (typeof RIDE_VIEWS)[number];

export interface RidesState {
  view: RideView;
  q: string;
  units: Units;
}

export function parseView(value: string | null | undefined): RideView {
  return RIDE_VIEWS.find((view) => view === value) ?? "log";
}

function search(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return query === "" ? "" : `?${query}`;
}

/** The list in this state: `/rides?view=records&units=metric`. */
export function ridesHref({ view, q, units }: RidesState): string {
  const params: Record<string, string> = {};
  if (view !== "log") params.view = view;
  if (q.trim() !== "") params.q = q.trim();
  if (units !== "imperial") params.units = units;
  return `/rides${search(params)}`;
}

export { rideTransitionName } from "@/transitions/names";

/** A ride's page, in the units the list was showing. */
export function rideHref(id: string, units: Units): string {
  return `/rides/${encodeURIComponent(id)}${search(units === "metric" ? { units } : {})}`;
}
