<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import ReadingProgress from "./ReadingProgress.vue";

const controls: StoryControlSet = {
  category: categoryControl,
};

function initState() {
  return { category: "writing" };
}
</script>

<template>
  <Story
    title="Reading progress"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Reading progress" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div :class="storyCategory(state.category).scope">
          <ReadingProgress />
          <div
            class="flex max-w-[680px] flex-col gap-4 pt-4 text-[17px] leading-[1.7]"
          >
            <p v-for="n in 12" :key="n">
              Paragraph {{ n }}. Scroll the story and the bar under the top edge
              fills with the page, driven by the scroll position alone. Prose
              runs at seventeen pixels on a line height of 1.7, at a measure of
              680.
            </p>
          </div>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Reading progress

A 2px bar under the header on a post, filling as the page scrolls. It is a CSS
scroll-driven animation, so a post ships without a script for it. A browser
lacking scroll timelines leaves it empty.

The bar follows the root scroller, which in the story book is the preview's own
document.
</docs>
