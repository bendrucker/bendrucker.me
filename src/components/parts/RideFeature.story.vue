<script setup lang="ts">
import {
  bareRide,
  epicRide,
  everydayRide,
} from "@/components/cycling/fixtures";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import RideFeature from "./RideFeature.vue";

const RIDES = {
  epic: {
    ride: epicRide,
    route: epicRide.route,
    figures: ["139 mi", "18,100 ft"],
    hilly: true,
  },
  everyday: {
    ride: everydayRide,
    route: everydayRide.route,
    figures: ["22 mi", "1,400 ft"],
    hilly: false,
  },
  trackless: {
    ride: epicRide,
    route: undefined,
    figures: ["139 mi", "18,100 ft"],
    hilly: true,
  },
  bare: { ride: bareRide, route: undefined, figures: ["48 mi"], hilly: false },
} as const;

type RideKey = keyof typeof RIDES;

const controls: StoryControlSet = {
  ride: {
    type: "select",
    title: "ride",
    options: {
      epic: "map and photos",
      everyday: "short loop",
      trackless: "photos, no route",
      bare: "no route or photos",
    },
  },
  photos: { type: "select", title: "photos", options: ["0", "1", "2", "4"] },
  width: { type: "slider", title: "width", min: 280, max: 720, step: 10 },
};

function initState() {
  const ride: RideKey = "epic";
  return { ride, photos: "2", width: 358 };
}

function featureProps(key: RideKey, count: number) {
  const { ride, route, figures, hilly } = RIDES[key];
  return {
    href: "#",
    id: ride.id,
    name: ride.name,
    when: "Saturday, July 11",
    figures,
    hilly,
    route,
    photos: ride.media
      .slice(0, count)
      .map((item) => ({ url: item.thumbnailUrl, alt: item.alt })),
  };
}
</script>

<template>
  <Story
    title="Ride feature"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Rides card lead" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-xl tint-5 p-4 cat-rides"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <RideFeature
            v-bind="featureProps(state.ride, Number(state.photos))"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Ride feature

The Rides home card leads with its top highlight: the route map, then the
ride's day, name, distance, and climbing, then a row of photos, so the words
show within the card's peek at either width. The map is 120px wide on a phone
and 176px from the desktop breakpoint up. Widen the frame past 768px of
viewport to see that.

The row holds up to four photos and shows as many as the card has room for:
two on a phone, three on a desktop card, and four on a wide one. A ride with no route
drops the map and keeps its words and photos.

The story book has no worker, so the map draws its route line on the card's
tint with no basemap behind it. The photos are placeholder images.
</docs>
