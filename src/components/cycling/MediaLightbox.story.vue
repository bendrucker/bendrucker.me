<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { ref } from "vue";
import { crowdedRide, raceRide, travelRide } from "./fixtures";
import MediaLightbox from "./MediaLightbox.vue";
import MediaStrip from "./MediaStrip.vue";
import type { RideMedia } from "@/activity/types";

const mediaSets: Record<string, RideMedia[]> = {
  five: travelRide.media,
  two: travelRide.media.slice(0, 2),
  one: raceRide.media,
  none: [],
};

const fromStrip = ref(0);
const fromStripOpen = ref(false);

function openStrip(index: number) {
  fromStrip.value = index;
  fromStripOpen.value = true;
}

const controls: StoryControlSet = {
  media: {
    type: "select",
    title: "media",
    options: {
      five: "video, four photos",
      two: "video, one photo",
      one: "one photo, no arrows",
      none: "none left",
    },
  },
  index: { type: "slider", title: "index", min: 0, max: 4 },
  open: { type: "checkbox", title: "open" },
};

function initState() {
  return { media: "five", index: 2, open: false };
}
</script>

<template>
  <Story
    title="Media lightbox"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Media lightbox" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <button
          type="button"
          class="rounded border border-border px-2 py-1 text-[11px]"
          @click="state.open = true"
        >
          open at item {{ state.index + 1 }} of
          {{ mediaSets[state.media]!.length }}
        </button>
        <MediaLightbox
          v-model:index="state.index"
          :media="mediaSets[state.media]!"
          :ride-name="travelRide.name"
          :ride-url="travelRide.stravaUrl"
          :open="state.open"
          @close="state.open = false"
        />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="Opened from a strip">
      <MediaStrip :media="crowdedRide.media" @open="openStrip" />
      <MediaLightbox
        v-model:index="fromStrip"
        :media="crowdedRide.media"
        :ride-name="crowdedRide.name"
        :ride-url="crowdedRide.stravaUrl"
        :open="fromStripOpen"
        @close="fromStripOpen = false"
      />
    </Variant>
  </Story>
</template>

<docs lang="md">
# Media lightbox

Full-screen viewing, opened from a ride's strip.

The first item of the five- and two-item sets is a video: it arrives paused with
controls and nothing buffered, and paging off it stops whatever was playing. A
photo is an `<img>` as before.

Open it, then cut the count from the panel while it is still open: the index has
to survive the array shrinking under it, including to nothing. The index slider
reaches past the shorter sets on purpose.
</docs>
