// One ride as its page and the Rides list's modal both show it. The server
// projects a `RideDetail` to this shape for the page, for a shared link that
// opens the modal, and for `/rides/<id>.json`, which the modal fetches when a
// row is clicked. The browser parses that response through the schema here.
//
// Figures stay raw on the wire and are formatted where they show, since the
// list's units toggle can change under an open modal.
import * as z from "zod/mini";
import type { RideDetail } from "@/activity/feed";
import { previewUrl } from "@/photos";
import { decodedSegment } from "@/detail/url";

/** Activity ids are ULIDs. Anything else is refused before it reaches a query. */
export const RIDE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const RIDE_PATH = /^\/rides\/([^/]+)$/;

/** The query parameter the Rides list names an open ride under. */
export const RIDE_PARAM = "ride";

/** The ride a path is the page of, or null. */
export function rideKey(pathname: string): string | null {
  const match = RIDE_PATH.exec(pathname);
  if (match === null) return null;
  const id = decodedSegment(match[1]!);
  return RIDE_ID.test(id) ? id : null;
}

/** Where the modal fetches a ride from. */
export function rideDetailUrl(id: string): string {
  return `/rides/${encodeURIComponent(id)}.json`;
}

const media = z.object({
  id: z.string(),
  kind: z.enum(["photo", "video"]),
  thumbnailUrl: z.string(),
  fullUrl: z.string(),
  alt: z.string(),
  previewUrl: z.optional(z.string()),
});

const figure = z.nullable(z.number());

export const rideDetailWire = z.object({
  id: z.string(),
  name: z.string(),
  /** Local wall-clock ISO string, without a zone suffix. */
  startedAt: z.string(),
  stravaUrl: z.optional(z.string()),
  /** The track as an encoded polyline, where there is one to draw. */
  route: z.optional(z.string()),
  description: z.nullable(z.string()),
  distanceM: figure,
  elevationM: figure,
  movingS: figure,
  averageWatts: figure,
  normalizedWatts: figure,
  averageHeartRate: figure,
  temperatureLowC: figure,
  temperatureHighC: figure,
  media: z.array(media),
});

export type RideDetailWire = z.infer<typeof rideDetailWire>;

export function toRideDetailWire(detail: RideDetail): RideDetailWire {
  const { ride } = detail;
  const wire: RideDetailWire = {
    id: ride.id,
    name: ride.name,
    startedAt: ride.startedAt,
    description: detail.description,
    distanceM: detail.distanceM,
    elevationM: detail.elevationM,
    movingS: detail.movingS,
    averageWatts: detail.averageWatts,
    normalizedWatts: detail.normalizedWatts,
    averageHeartRate: detail.averageHeartRate,
    temperatureLowC: detail.temperatureLowC,
    temperatureHighC: detail.temperatureHighC,
    // A shot at its own shape, bounded by height, which only a ride's own
    // view draws.
    media: ride.media.map((item) => ({
      ...item,
      previewUrl: previewUrl(item.id),
    })),
  };
  if (ride.stravaUrl !== undefined) wire.stravaUrl = ride.stravaUrl;
  if (ride.route !== undefined) wire.route = ride.route;
  return wire;
}

export async function fetchRideDetail(id: string): Promise<RideDetailWire> {
  const response = await fetch(rideDetailUrl(id));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return rideDetailWire.parse(await response.json());
}
