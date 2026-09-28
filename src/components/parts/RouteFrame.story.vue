<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import ItemRow from "./ItemRow.vue";
import RouteFrame from "./RouteFrame.vue";
import SearchControl from "./SearchControl.vue";
import SectionHead from "./SectionHead.vue";
import SegmentGroup from "./SegmentGroup.vue";
import TimelineGutter from "./TimelineGutter.vue";
import UnitsToggle from "./UnitsToggle.vue";

const VIEWS = [
  { value: "log", label: "Log", icon: "list" },
  { value: "routes", label: "Routes", icon: "map" },
  { value: "records", label: "Records", icon: "trophy" },
] as const;

const ROWS = [
  {
    day: "11",
    sub: "jul",
    title: "Friends of Tam",
    text: "MV FF BF SB RRG",
    figure: "139 mi",
  },
  { day: "29", sub: "aug", title: "Tres", figure: "186 mi" },
  { day: "3", sub: "jul", title: "Atlas", figure: "196 mi" },
];

const controls: StoryControlSet = {
  category: categoryControl,
};

function initState() {
  return { category: "rides", q: "", view: "log", units: "imperial" };
}
</script>

<template>
  <Story
    title="Route layout"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Route layout" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <RouteFrame :id="storyCategory(state.category).id">
          <template #views>
            <SegmentGroup
              v-model="state.view"
              :options="VIEWS"
              label="View"
              icon-only
            />
          </template>
          <template #tools>
            <SearchControl
              v-model="state.q"
              :noun="storyCategory(state.category).noun"
            />
            <UnitsToggle v-model="state.units" form="segment" />
          </template>
          <template #sidebar>
            <SearchControl
              v-model="state.q"
              :noun="storyCategory(state.category).noun"
            />
            <div class="flex flex-col gap-1.5">
              <p class="px-1 label-caps">View</p>
              <SegmentGroup
                v-model="state.view"
                :options="VIEWS"
                label="View"
                list
              />
              <UnitsToggle v-model="state.units" class="mt-2 px-1" />
            </div>
          </template>
          <template #highlights>
            <SectionHead label="Highlights" />
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="(row, i) in ROWS"
                :key="row.title"
                :class="i > 1 ? 'max-md:hidden' : ''"
              >
                <ItemRow
                  href="#"
                  :title="row.title"
                  :text="row.text"
                  :figure="row.figure"
                >
                  <template #gutter>
                    <TimelineGutter :day="row.day" :sub="row.sub" />
                  </template>
                </ItemRow>
              </li>
            </ul>
          </template>
          <SectionHead label="September" />
          <ul class="flex flex-col gap-1.5">
            <li v-for="row in ROWS" :key="row.title">
              <ItemRow href="#" :title="row.title" :figure="row.figure">
                <template #gutter>
                  <TimelineGutter :day="row.day" />
                </template>
              </ItemRow>
            </li>
          </ul>
        </RouteFrame>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Route layout

The frame every route page shares, which `RouteLayout.astro` wraps: the title
in the category's color, the controls, the highlights, and the sections, all on
the category's ground.

On a phone the view switch sits beside the title as icons, and the tools stick
to the top under it. From the desktop breakpoint up the tools move into a
sticky sidebar beside a 680px list. The two copies are switched in CSS, so
open the full-width link on a desktop to see the sidebar.

The last highlight hides on a phone, as the real routes do.
</docs>
