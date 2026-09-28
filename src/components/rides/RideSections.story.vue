<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { matches } from "@/activity/search";
import { allRows, logRows, THIS_YEAR } from "./fixtures";
import RideSections from "./RideSections.vue";

const rowSets = {
  log: logRows,
  archive: allRows,
  none: [],
};

const controls: StoryControlSet = {
  rows: {
    type: "select",
    title: "rows",
    options: { log: "two months", archive: "across years", none: "nothing" },
  },
  query: { type: "text", title: "search" },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
  paging: {
    type: "select",
    title: "paging",
    options: { done: "all loaded", loading: "loading", failed: "failed" },
  },
};

function initState() {
  return {
    rows: "log" as keyof typeof rowSets,
    query: "",
    units: "imperial" as "imperial" | "metric",
    paging: "done",
  };
}

function rowsFor(state: ReturnType<typeof initState>) {
  return rowSets[state.rows].filter((row) =>
    matches({ title: row.name }, state.query),
  );
}
</script>

<template>
  <Story
    title="Ride sections"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Ride sections" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div class="max-w-[714px] tint-5 px-3 pb-4 cat-rides">
          <RideSections
            :rows="rowsFor(state)"
            :units="state.units"
            :this-year="THIS_YEAR"
            :query="state.query"
            :has-more="state.paging !== 'done'"
            :loading="state.paging === 'loading'"
            :failed="state.paging === 'failed'"
            @load-more="logEvent('loadMore', {})"
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
# Ride sections

The Rides route's log: rides grouped by month under a timeline gutter that
prints each day once and breaks its line between weeks. The same list renders
search results, with the query marked in each title.

Months far from the viewport drop their rows and hold their height, so a log
paged back to the first ride stays a few dozen rows deep. "Across years" shows
the year a section names once it isn't this one. The paging control shows the
loading line and the retry a failed page leaves behind.
</docs>
