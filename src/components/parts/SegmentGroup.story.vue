<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import SegmentGroup, { type SegmentOption } from "./SegmentGroup.vue";

const optionSets: Record<string, SegmentOption[]> = {
  owner: [
    { value: "all", label: "All" },
    { value: "mine", label: "Mine" },
    { value: "others", label: "Others" },
  ],
  views: [
    { value: "log", label: "Log", icon: "list" },
    { value: "routes", label: "Routes", icon: "map" },
    { value: "records", label: "Records", icon: "trophy" },
  ],
  types: [
    { value: "", label: "All" },
    { value: "Book", label: "Books", icon: "book" },
    { value: "Article", label: "Articles", icon: "newspaper" },
  ],
};

function selected(state: { set: string; value: string }): string {
  const options = optionSets[state.set]!;
  return options.some((option) => option.value === state.value)
    ? state.value
    : (options[0]?.value ?? "");
}

const controls: StoryControlSet = {
  set: {
    type: "select",
    title: "options",
    options: { owner: "owner", views: "view switch", types: "types" },
  },
  size: { type: "select", title: "size", options: ["sm", "md"] },
  fill: { type: "checkbox", title: "fill" },
  iconOnly: { type: "checkbox", title: "icons only" },
  list: { type: "checkbox", title: "list" },
  category: categoryControl,
  width: { type: "slider", title: "width", min: 160, max: 340 },
};

function initState() {
  return {
    set: "owner",
    value: "mine",
    size: "md",
    fill: false,
    iconOnly: false,
    list: false,
    category: "code",
    width: 340,
  };
}
</script>

<template>
  <Story
    title="Segment"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Segment" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          :class="storyCategory(state.category).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <SegmentGroup
            :model-value="selected(state)"
            :options="optionSets[state.set]!"
            label="Filter"
            :size="state.size"
            :fill="state.fill"
            :icon-only="state.iconOnly"
            :list="state.list"
            @update:model-value="
              state.value = $event;
              logEvent('update:modelValue', { value: $event });
            "
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
# Segment

A radio group drawn as a pill row, for a filter with a few fixed values:
whose repository, which type on a media route, and the view switch beside a
route's title. The chosen segment lifts onto the page's ground in the
category's color. Arrow keys move between segments.

Fill splits the width evenly, for the owner and type filters on a phone.
Icons only keeps each label for a screen reader, which is the view switch on a
phone. List stacks the options, which is the view switch in the desktop sidebar.
</docs>
