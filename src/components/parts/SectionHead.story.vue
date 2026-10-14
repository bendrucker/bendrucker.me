<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import SectionHead from "./SectionHead.vue";

const controls: StoryControlSet = {
  label: {
    type: "select",
    title: "label",
    options: ["Highlights", "September", "December 2025", "Summer", "2024"],
  },
  gutter: { type: "checkbox", title: "gutter" },
  category: categoryControl,
};

function initState() {
  return { label: "September", gutter: true, category: "rides" };
}
</script>

<template>
  <Story
    title="Section head"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Section head" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-xl tint-5 px-2 pb-2"
          :class="storyCategory(state.category).scope"
        >
          <SectionHead :label="state.label" :gutter="state.gutter" />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Section head

The label over each group of rows: Highlights, a month, a season, or a year.
Mono, uppercase, tracked, and dim. The year appears only when it isn't this
one.

With the gutter, the label indents past the timeline so it sits over the rows'
text. Media routes draw their rows without a gutter and turn it off.
</docs>
