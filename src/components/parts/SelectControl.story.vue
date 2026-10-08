<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import SelectControl, { type SelectOption } from "./SelectControl.vue";

const LANGUAGES: SelectOption[] = [
  { value: "Go", label: "Go" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "HCL", label: "HCL" },
];

const LANGUAGE_COLORS: Record<string, string> = {
  Go: "#00ADD8",
  TypeScript: "#3178c6",
  HCL: "#844FBA",
};

const SORTS: SelectOption[] = [
  { value: "recent", label: "Recent" },
  { value: "stars", label: "Stars" },
  { value: "name", label: "Name" },
];

const controls: StoryControlSet = {
  category: categoryControl,
};

function initState() {
  return { language: "", tag: "Software", sort: "recent", category: "code" };
}
</script>

<template>
  <Story
    title="Select"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Language, tag, and sort" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="flex flex-wrap items-center gap-2"
          :class="storyCategory(state.category).scope"
        >
          <SelectControl
            v-model="state.language"
            :options="LANGUAGES"
            label="Language"
            placeholder="Language"
            :dot="LANGUAGE_COLORS[state.language]"
            @update:model-value="logEvent('language', { value: $event })"
          />
          <SelectControl
            v-model="state.tag"
            :options="[
              { value: 'Software', label: 'Software' },
              { value: 'Open Source', label: 'Open Source' },
            ]"
            label="Tag"
            placeholder="Tag"
            icon="tag"
            @update:model-value="logEvent('tag', { value: $event })"
          />
          <SelectControl
            v-model="state.sort"
            :options="SORTS"
            label="Sort"
            icon="arrow-down-up"
            :tint="false"
            @update:model-value="logEvent('sort', { value: $event })"
          />
          <SelectControl
            v-model="state.sort"
            :options="SORTS"
            label="Sort"
            icon="arrow-down-up"
            icon-only
            :tint="false"
            @update:model-value="logEvent('sort', { value: $event })"
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
# Select

A native select laid over a styled face, so a tap opens the platform's own
picker. The face shows the choice or a placeholder, and fills with the
category's tint once a value is set. Clearing it back to the placeholder
removes the fill.

Sort is always set, so it keeps the plain face. On a phone it shows only its
icon, the last of the four here.
</docs>
