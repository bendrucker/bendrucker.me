<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import SearchControl from "./SearchControl.vue";

const controls: StoryControlSet = {
  collapsible: { type: "checkbox", title: "collapsible" },
  category: categoryControl,
  width: { type: "slider", title: "width", min: 160, max: 340 },
};

function initState() {
  return { q: "", collapsible: false, category: "rides", width: 340 };
}

function initFilled() {
  return { q: "tam", collapsible: false, category: "rides", width: 340 };
}

function update(state: { q: string }, value: string) {
  state.q = value;
  logEvent("update:modelValue", { value });
}
</script>

<template>
  <Story
    title="Search"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Search" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          :key="String(state.collapsible)"
          class="flex justify-end rounded-xl tint-5 p-2"
          :class="storyCategory(state.category).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <SearchControl
            :model-value="state.q"
            :noun="storyCategory(state.category).noun"
            :collapsible="state.collapsible"
            :status="state.q ? '4 matches' : ''"
            @update:model-value="update(state, $event)"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="With a query" :init-state="initFilled">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          :key="String(state.collapsible)"
          class="flex justify-end rounded-xl tint-5 p-2"
          :class="storyCategory(state.category).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <SearchControl
            :model-value="state.q"
            :noun="storyCategory(state.category).noun"
            :collapsible="state.collapsible"
            @update:model-value="update(state, $event)"
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
# Search

The first control on every route. The field is 16px on a phone so iOS leaves
the page's zoom alone, and 14px on desktop. Focus draws the category's ring.
A clear button appears once there is text.

Turn on collapsible for the phone's tool row. It starts as an icon button at
the right, opens into the field and focuses it, and stays open while there is
a query. Escape clears the text first, then closes the field and returns focus
to the button.

Matches are announced politely through a status region the field carries.
</docs>
