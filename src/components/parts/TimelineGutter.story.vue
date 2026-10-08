<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { groupRows, type GroupMode } from "@/activity/sections";
import { categoryControl, storyCategory } from "./fixtures";
import ItemRow from "./ItemRow.vue";
import SectionHead from "./SectionHead.vue";
import TimelineGutter from "./TimelineGutter.vue";

const RIDES = [
  { day: "2026-09-23", title: "Boot Camp", figure: "15 mi", hilly: true },
  { day: "2026-09-23", title: "Cinderella", figure: "17 mi" },
  { day: "2026-09-22", title: "Headlands", figure: "23 mi", hilly: true },
  { day: "2026-09-20", title: "Richfield", figure: "10 mi" },
  { day: "2026-09-19", title: "Stinson EP Alpine", figure: "67 mi" },
  { day: "2026-08-29", title: "Tres", figure: "186 mi" },
  { day: "2025-12-14", title: "Old La Honda", figure: "41 mi", hilly: true },
];

const controls: StoryControlSet = {
  mode: {
    type: "select",
    title: "group by",
    options: { month: "month", year: "year" },
  },
  category: categoryControl,
  width: { type: "slider", title: "width", min: 240, max: 680, step: 10 },
};

function initState() {
  return { mode: "month", category: "rides", width: 680 };
}

function sections(mode: unknown) {
  const grouping: GroupMode = mode === "year" ? "year" : "month";
  return groupRows(RIDES, grouping, { thisYear: "2026" });
}
</script>

<template>
  <Story
    title="Timeline gutter"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Grouped rides" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-2xl tint-5 px-2 pb-3"
          :class="storyCategory(state.category).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <section v-for="section in sections(state.mode)" :key="section.key">
            <SectionHead :label="section.label" />
            <ul
              v-for="week in section.weeks"
              :key="week.key"
              class="flex flex-col gap-1.5 pb-1.5"
            >
              <li v-for="(row, i) in week.rows" :key="row.item.title">
                <ItemRow
                  href="#"
                  :title="row.item.title"
                  :figure="row.item.figure"
                  :hilly="row.item.hilly"
                >
                  <template #gutter>
                    <TimelineGutter
                      :day="row.dayNum"
                      :sub="row.sub"
                      :show-day="row.showDay"
                      :week-end="i === week.rows.length - 1"
                    />
                  </template>
                </ItemRow>
              </li>
            </ul>
          </section>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Timeline gutter

A hairline down the left of a list in the category's color at 22%, broken
between weeks. The day sits on the line at the first row of a day, and a second
row the same day leaves it blank.

Grouped by year, as Writing is, the month appears under the day because the
section no longer names it.
</docs>
