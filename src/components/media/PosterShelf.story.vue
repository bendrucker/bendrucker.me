<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { storyFeed, storyHighlights } from "./fixtures";
import PosterShelf from "./PosterShelf.vue";

const controls: StoryControlSet = {
  count: { type: "slider", title: "posters", min: 1, max: 6 },
  width: { type: "slider", title: "width", min: 240, max: 680, step: 10 },
  layout: { type: "select", title: "layout", options: ["route", "home"] },
};

async function initState() {
  const layout: "route" | "home" = "route";
  return { feed: await storyFeed("watching"), count: 3, width: 358, layout };
}
</script>

<template>
  <Story
    title="Poster shelf"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Watching highlights" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-2xl bg-background p-2 cat-watching"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <PosterShelf
            :items="storyHighlights(state.feed, state.count)"
            :layout="state.layout"
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
# Poster shelf

Watching's highlights: three posters on a phone, five from the desktop
breakpoint up, sharing the row evenly. A show names its season beside its
title, as "S2", and carries a bar of episode ticks under its poster. Past
twelve episodes one tick stands for several and fills by the share of them
watched. A movie has neither, which is what marks it.

The `home` layout is the home card's: the title comes first and the poster
sits beneath it, capped at 72px on desktop, so a card cut short at its peek
still names each show. A phone's poster fills its share of the row, and a
touch screen names it only once tapped: the first tap lays the title over the
art with an outbound mark, and a second opens it. The Watching route keeps the default `route` layout.

Hover lifts and tilts a poster with a sheen across it. A tap plays a bigger
lift, then opens the poster's link in a new tab. Under reduced motion the
poster stays still and the link opens at once.

The artwork here is generated stand-ins.
</docs>
