<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { CATEGORIES } from "@/categories";
import { storyCategory } from "./fixtures";
import HomeCard from "./HomeCard.vue";
import ItemRow from "./ItemRow.vue";

const controls: StoryControlSet = {
  count: { type: "slider", title: "cards", min: 1, max: 6 },
  width: { type: "slider", title: "width", min: 300, max: 1060, step: 10 },
};

function initState() {
  return { count: 3, width: 1060 };
}

const ROWS: Record<string, { title: string; text?: string; org?: string }[]> = {
  rides: [{ title: "Friends of Tam", text: "139 mi" }],
  code: [{ title: "extensions", org: "raycast" }],
  reading: [{ title: "The Overstory", text: "Richard Powers" }],
  writing: [{ title: "Friends of Tam", text: "Sep 15" }],
  watching: [{ title: "Severance", text: "Season 2" }],
  listening: [{ title: "In Rainbows", text: "Radiohead" }],
};
</script>

<template>
  <Story
    title="Home card"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Home cards" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="grid gap-3 md:grid-cols-2"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <HomeCard
            v-for="cat in CATEGORIES.slice(0, state.count)"
            :id="cat.id"
            :key="cat.id"
          >
            <ul class="flex flex-col gap-0.5">
              <li v-for="row in ROWS[cat.id]" :key="row.title">
                <ItemRow
                  href="#"
                  :title="row.title"
                  :text="row.text"
                  :org="row.org"
                  :lead="cat.id === 'code' ? 'dot' : 'none'"
                  dot="#3178c6"
                  :via="storyCategory(cat.id).art ? 'Trakt' : undefined"
                  compact
                />
              </li>
            </ul>
          </HomeCard>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Home card

One category on the home page. A watermark of its icon sits in the heading
band at 8%, 60px on a phone and 76px on desktop. The heading opens the route.

The grid is two columns from the desktop breakpoint up, and an odd card out
spans both. Set three cards at full width to see it.
</docs>
