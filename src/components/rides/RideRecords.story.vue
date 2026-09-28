<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { ALL_TIME, type RecordsPage } from "@/rides/records";
import { allRows, recordPeriods, recordsPageFor, THIS_YEAR } from "./fixtures";
import RideRecords from "./RideRecords.vue";

const controls: StoryControlSet = {
  period: {
    type: "select",
    title: "period",
    options: recordPeriods.map((records) => records.period),
  },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
  fetch: {
    type: "select",
    title: "other periods",
    options: ["load", "fail"],
  },
  q: { type: "text", title: "search" },
};

function initState() {
  return {
    period: ALL_TIME,
    units: "imperial" as "imperial" | "metric",
    fetch: "load" as "load" | "fail",
    q: "",
  };
}

type State = ReturnType<typeof initState>;

/** Stands in for the worker's route, which the story book doesn't have. */
function loader(state: State) {
  return async (period: string): Promise<RecordsPage> => {
    logEvent("load", { period });
    await Promise.resolve();
    if (state.fetch === "fail") throw new Error("Offline");
    return recordsPageFor(period);
  };
}

/** The page renders the period it opened on, and fetches every other. */
function key(state: State): string {
  return `${state.fetch}:${state.q === "" ? "" : "search"}`;
}

function matches(q: string) {
  const needle = q.trim().toLowerCase();
  return allRows.filter((row) => row.name.toLowerCase().includes(needle));
}
</script>

<template>
  <Story
    title="Ride records"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Records by period" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div class="max-w-[714px] tint-5 px-3 pb-4 cat-rides">
          <RideRecords
            :key="key(state)"
            v-model:period="state.period"
            :initial="recordsPageFor(ALL_TIME)"
            :units="state.units"
            :this-year="THIS_YEAR"
            :query="state.q.trim()"
            :matches="matches(state.q)"
            :load="loader(state)"
            @clear="state.q = ''"
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
# Ride records

The Records view on `/rides`: for all time and for each year, the best power
over five durations and the five longest rides, rides with the most climbing,
and longest days moving. Every row opens its ride.

The page renders the period it opened on, and the picker fetches the others.
Here a stand-in answers from the fixtures, and "other periods: fail" shows the
line and retry a reader gets when that fetch fails. 2024 predates the fixture
rider's power meter, so its power list is empty.

A search narrows the records to the rides it matches, across all time, with the
longest and most-climbing lists only.

Two columns from the medium breakpoint up, one on a phone.
</docs>
