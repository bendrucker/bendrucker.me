<script setup lang="ts">
import { monthsByYear } from "@/activity/sections";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import DateRail from "./DateRail.vue";
import { categoryControl, storyCategory } from "./fixtures";

/** Fourteen years back from a September, with a quiet month in each. */
function archive(years: number): string[] {
  const keys: string[] = [];
  for (let year = 2026; year > 2026 - years; year -= 1) {
    for (let month = year === 2026 ? 9 : 12; month >= 1; month -= 1) {
      if ((year + month) % 5 !== 0) {
        keys.push(`${year}-${String(month).padStart(2, "0")}`);
      }
    }
  }
  return keys;
}

const controls: StoryControlSet = {
  years: { type: "select", title: "years", options: ["2", "8", "14"] },
  category: categoryControl,
};

function initState() {
  return { years: "14", active: "2026-09", category: "rides" };
}
</script>

<template>
  <Story
    title="Date rail"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 260 }"
  >
    <Variant title="Date rail" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="w-[236px] rounded-xl tint-5 p-2"
          :class="storyCategory(state.category).scope"
        >
          <DateRail
            :years="monthsByYear(archive(Number(state.years)))"
            :active="state.active"
            @jump="state.active = $event"
          />
        </div>
      </template>
      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>
