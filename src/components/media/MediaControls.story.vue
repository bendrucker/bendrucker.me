<script setup lang="ts">
import { category } from "@/categories";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { mediaCategory, mediaControl } from "./fixtures";
import MediaControls from "./MediaControls.vue";

const controls: StoryControlSet = {
  category: mediaControl,
  collapsible: { type: "checkbox", title: "phone row" },
  width: { type: "slider", title: "width", min: 180, max: 680, step: 10 },
};

function initState() {
  return { category: "watching", collapsible: true, width: 358 };
}
</script>

<template>
  <Story
    title="Media controls"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Controls" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-2xl bg-background p-2"
          :class="category(mediaCategory(state.category)).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <MediaControls
            :key="`${state.category}-${state.collapsible}`"
            :id="mediaCategory(state.category)"
            :initial="{ q: '', type: '', count: 0 }"
            :collapsible="state.collapsible"
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
# Media controls

The type segment and search for Reading, Watching, and Listening. The page
renders two copies: one in the phone's tool row, where the search starts as a
button beside the segment, and one in the desktop sidebar, where the field is
always open above it. Opening the search on a phone gives the field its own
row above the segment.

Both copies and the list share one state per route, and it is written to the
URL as `q` and `type` so a filtered view can be shared. Without a script the
form submits and the server renders the result.

Here the count stays at zero, since no list is attached. The Media list story
shows the controls driving one.
</docs>
