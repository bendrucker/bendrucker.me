<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { storyFeed, storyHighlights } from "./fixtures";
import RecordShelf from "./RecordShelf.vue";

const controls: StoryControlSet = {
  count: { type: "slider", title: "records", min: 1, max: 5 },
  width: { type: "slider", title: "width", min: 240, max: 680, step: 10 },
  layout: { type: "select", title: "layout", options: ["route", "home"] },
};

async function initState() {
  const layout: "route" | "home" = "route";
  return { feed: await storyFeed("listening"), count: 3, width: 358, layout };
}
</script>

<template>
  <Story
    title="Record shelf"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Listening highlights" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-2xl bg-background p-2 cat-listening"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <RecordShelf
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
# Record shelf

Listening's highlights, ranked by plays: four on a phone, five from the
desktop breakpoint up. An album sits in its sleeve with the disc peeking out
behind it, labelled in the color the fixture gives it. A podcast is a square
cover with a podcast badge and no disc.

The `home` layout is the home card's: the title and artist come first and the
sleeve sits beneath them, capped at 72px on desktop, so a card cut short at
its peek still names each record. On a phone an album takes a sleeve's
share of the row like a podcast, its disc sliding over the gap as it leaves,
and a touch screen names it only once tapped. The Listening route keeps the
default `route` layout.

Hover slides the disc further out over 0.55s. A tap slides it out over 0.45s,
spins it once clear of the sleeve, then opens the link in a new tab. It slides
back over 0.35s. Under reduced motion nothing slides or spins, and the link
opens at once.

The artwork here is generated stand-ins.
</docs>
