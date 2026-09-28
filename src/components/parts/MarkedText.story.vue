<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import MarkedText from "./MarkedText.vue";

const controls: StoryControlSet = {
  text: { type: "text", title: "text" },
  query: { type: "text", title: "search" },
  category: categoryControl,
};

function initState() {
  return {
    text: "Tam to Tamalpais, then Friends of Tam again",
    query: "tam",
    category: "rides",
  };
}
</script>

<template>
  <Story
    title="Marked text"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Marked text" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <p
          class="text-[15px] text-foreground"
          :class="storyCategory(state.category).scope"
        >
          <MarkedText :text="state.text" :query="state.query" />
        </p>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Marked text

A search match inside any text a row renders. Every occurrence is marked, in
any case, in the category's color at a quarter strength so the text stays
readable over it.
</docs>
