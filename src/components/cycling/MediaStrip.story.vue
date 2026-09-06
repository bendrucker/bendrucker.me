<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { logEvent } from "histoire/client";
import {
  bareRide,
  crowdedRide,
  epicRide,
  raceRide,
  travelRide,
} from "./fixtures";
import MediaStrip from "./MediaStrip.vue";
import type { RideMedia } from "@/activity/types";

const mediaSets: Record<string, RideMedia[]> = {
  one: raceRide.media,
  three: epicRide.media,
  video: travelRide.media,
  twelve: crowdedRide.media,
  none: bareRide.media,
  broken: travelRide.media.map((item) =>
    item.kind === "video"
      ? { ...item, thumbnailUrl: "/missing-poster.jpg" }
      : item,
  ),
};

const controls: StoryControlSet = {
  media: {
    type: "select",
    title: "media",
    options: {
      one: "one photo",
      three: "three photos",
      video: "a video first",
      twelve: "twelve photos",
      none: "nothing",
      broken: "video, no poster",
    },
  },
  width: { type: "slider", title: "width", min: 96, max: 340 },
};

function initState() {
  return { media: "video", width: 340 };
}
</script>

<template>
  <Story
    title="Media strip"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
    :init-state="initState"
  >
    <Variant title="Media strip">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
          <MediaStrip
            :media="mediaSets[state.media]!"
            @open="logEvent('open', { index: $event })"
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
# Media strip

The row of thumbnails on a ride card, photos and videos alike.

A video is its poster frame under a dimmed overlay with a play glyph. The "video,
no poster" set is what the strip shows when the thumbnail route could not cut a
frame and answered 404: the tile keeps its size and the glyph stands alone.

Narrow the width until the row overflows: it stays one row, fading out at the
trailing edge rather than wrapping onto a second. Tapping a thumbnail logs the
index it would open in the lightbox.
</docs>
