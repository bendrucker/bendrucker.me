<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { crowdedRide, rankedLists } from "./fixtures";
import RankedListPanel from "./RankedListPanel.vue";
import type { RankedList } from "./types";
import UnitsProvider from "./UnitsProvider.vue";

function fixtureList(id: string): RankedList {
  return rankedLists.find((list) => list.id === id)!;
}

const distance = fixtureList("distance");
const efforts = fixtureList("efforts");

const lists: Record<string, RankedList> = {
  distance,
  elevation: fixtureList("elevation"),
  duration: fixtureList("duration"),
  climbs: fixtureList("climbs"),
  efforts,
  mixedLinks: {
    ...distance,
    rows: distance.rows.map((row, index) =>
      index === 1 ? { ...row, href: undefined } : row,
    ),
  },
  longNames: {
    ...distance,
    rows: distance.rows.map((row, index) =>
      index === 0 ? { ...row, name: crowdedRide.name } : row,
    ),
  },
  single: { ...efforts, rows: efforts.rows.slice(0, 1) },
  empty: { ...distance, rows: [] },
};

const controls: StoryControlSet = {
  list: {
    type: "select",
    title: "list",
    options: {
      distance: "longest rides",
      elevation: "most climbing",
      duration: "longest time",
      climbs: "largest climbs",
      efforts: "best efforts",
      mixedLinks: "some rows linked",
      longNames: "a long name",
      single: "a single row",
      empty: "no rows",
    },
  },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
};

function initState() {
  return { list: "distance", units: "imperial" };
}
</script>

<template>
  <Story
    title="Ranked list panel"
    group="records"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
    :init-state="initState"
  >
    <Variant title="Ranked list panel">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <UnitsProvider :units="state.units">
          <RankedListPanel :list="lists[state.list]!" />
        </UnitsProvider>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Ranked list panel

A numbered top-five: longest rides, most climbing, best efforts.

Each list carries its own metric, which decides whether a row reads as a
distance, a height, a duration, or a clock time. Rows link back to Strava only
when the row came from a ride: longest rides links every row, longest time links
none, largest climbs ranks segments rather than rides, and the mixed list is the
one to check.
</docs>
