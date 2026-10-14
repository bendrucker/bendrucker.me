<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import TagChips, { type TagChip } from "./TagChips.vue";

const sets: Record<string, TagChip[]> = {
  two: [
    { name: "Software", href: "#software" },
    { name: "Open Source", href: "#open-source" },
  ],
  many: [
    "Software",
    "Open Source",
    "Cycling",
    "Terraform",
    "Go",
    "Career",
    "A tag long enough to wrap",
  ].map((name) => ({ name, href: `#${name}` })),
};

const controls: StoryControlSet = {
  set: { type: "select", title: "tags", options: { two: "two", many: "many" } },
  category: categoryControl,
};

function initState() {
  return { set: "two", category: "writing" };
}
</script>

<template>
  <Story
    title="Tag chips"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Tag chips" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="bg-background p-2"
          :class="storyCategory(state.category).scope"
        >
          <TagChips :tags="sets[state.set]!" />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Tag chips

At a post's foot. Each chip opens Writing filtered to that tag, and deepens its
tint on hover.
</docs>
