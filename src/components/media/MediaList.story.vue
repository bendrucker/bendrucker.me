<script setup lang="ts">
import { category } from "@/categories";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import {
  STORY_YEAR,
  mediaCategory,
  mediaControl,
  storyFeeds,
} from "./fixtures";
import MediaControls from "./MediaControls.vue";
import MediaList from "./MediaList.vue";

const controls: StoryControlSet = {
  category: mediaControl,
  width: { type: "slider", title: "width", min: 280, max: 720, step: 10 },
};

async function initState() {
  return { feeds: await storyFeeds(), category: "listening", width: 358 };
}
</script>

<template>
  <Story
    title="Media list"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Route body" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          :key="state.category"
          class="flex flex-col gap-4 rounded-2xl bg-background p-2"
          :class="category(mediaCategory(state.category)).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <MediaControls
            :id="mediaCategory(state.category)"
            :initial="{ q: '', type: '', count: 0 }"
          />
          <MediaList
            :id="mediaCategory(state.category)"
            :rows="state.feeds[mediaCategory(state.category)].rows"
            :highlight-keys="
              state.feeds[mediaCategory(state.category)].highlightKeys
            "
            :initial="{ q: '', type: '', count: 0 }"
            :this-year="STORY_YEAR"
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
# Media list

The body of Reading, Watching, and Listening, with the phone's controls above
it: highlights, then everything else grouped by season, newest first. December
opens the next year's winter. Every row leaves the site through an outward
arrow, since there is no item page.

Favorites lead only the unfiltered list. Reading ranks a book with a note
first, Watching shows the latest, and Listening ranks by plays. A phone shows
three and a desktop five, so the fourth and fifth fall back into the phone's
list. That split follows the book's viewport, not the width control.

Search or pick a type to see the plain list, and search for something absent,
like "gardening", to see the empty state. The artwork here is generated
stand-ins.
</docs>
