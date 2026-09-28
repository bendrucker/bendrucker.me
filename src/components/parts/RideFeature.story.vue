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
      trackless: "photo, no route",
      bare: "no route or photo",
    },
  },
  photo: { type: "checkbox", title: "photo" },
  width: { type: "slider", title: "width", min: 280, max: 560, step: 10 },
};

function initState() {
  const ride: RideKey = "epic";
  return { ride, photo: true, width: 358 };
}

function featureProps(key: RideKey, withPhoto: boolean) {
  const { ride, route, figures, hilly } = RIDES[key];
  const [first] = ride.media;
  return {
    href: "#",
    id: ride.id,
    name: ride.name,
    figures,
    hilly,
    route,
    photo:
      withPhoto && first
        ? { url: first.thumbnailUrl, alt: first.alt }
        : undefined,
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
          <RideFeature v-bind="featureProps(state.ride, state.photo)" />
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

The Rides home card leads with its top highlight: the route map at the
highlight size, one photo tilted in the map's corner, and the ride's name over
its distance and climbing. On a phone the map takes the card's width and the
words sit beneath it. From the desktop breakpoint up the map stands 260px wide
with the words beside it. Widen the frame past 768px of viewport to see that.

A ride with no route drops the map and shows its photo alone, or only its
words when it has neither. Hover straightens the photo.

The story book has no worker, so the map draws its route line on the card's
tint with no basemap behind it. The photos are placeholder images.
</docs>
