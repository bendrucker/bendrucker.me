<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import EmptyState from "./EmptyState.vue";

const controls: StoryControlSet = {
  query: { type: "text", title: "search" },
  gutter: { type: "checkbox", title: "gutter" },
  category: categoryControl,
};

function initState() {
  return { query: "zzz", gutter: true, category: "rides" };
}
</script>

<template>
  <Story
    title="Empty state"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Empty state" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-xl tint-5 px-2"
          :class="storyCategory(state.category).scope"
        >
          <EmptyState
            :noun="storyCategory(state.category).noun"
            :query="state.query"
            :gutter="state.gutter"
            @clear="
              state.query = '';
              logEvent('clear', {});
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
# Empty state

What a route shows when a search or a filter leaves nothing. With a query it
names the query and says what search looks at. Without one it blames the
filters. Either way the button clears both.

Clear the search field here to see the filter wording.
</docs>
