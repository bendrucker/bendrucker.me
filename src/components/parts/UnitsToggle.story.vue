<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import UnitsToggle from "./UnitsToggle.vue";

const controls: StoryControlSet = {
  category: categoryControl,
};

function initState() {
  return { units: "imperial", category: "rides" };
}
</script>

<template>
  <Story
    title="Units toggle"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Phone and desktop" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="flex flex-col items-start gap-4"
          :class="storyCategory(state.category).scope"
        >
          <p class="label-caps">Phone, beside search</p>
          <UnitsToggle
            v-model="state.units"
            form="segment"
            @update:model-value="
              logEvent('update:modelValue', { value: $event })
            "
          />
          <p class="label-caps">Desktop, under the views</p>
          <UnitsToggle
            v-model="state.units"
            form="mini"
            @update:model-value="
              logEvent('update:modelValue', { value: $event })
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
# Units toggle

Miles or kilometers, in two forms bound to the same value here. On a phone it
is a small segment beside search. On desktop it is a line of mono text under
the views, the active unit underlined in the category's color.
</docs>
