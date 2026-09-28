<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { highlights, months, records, THIS_YEAR } from "./fixtures";
import RidesRoute from "./RidesRoute.vue";

const controls: StoryControlSet = {
  view: {
    type: "select",
    title: "view",
    options: ["log", "records"],
  },
  q: { type: "text", title: "search" },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
};

function initState() {
  return {
    view: "log" as "log" | "records",
    q: "",
    units: "imperial" as "imperial" | "metric",
  };
}

/** Remounts the route when a control changes, since it reads these once. */
function key(state: ReturnType<typeof initState>): string {
  return `${state.view}:${state.q}:${state.units}`;
}
</script>

<template>
  <Story
    title="Rides route"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Rides route" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <RidesRoute
          :key="key(state)"
          :view="state.view"
          :q="state.q"
          :units="state.units"
          :this-year="THIS_YEAR"
          :highlights="highlights"
          :months="months"
          :log-cursor="null"
          :records="records"
          :match-records="null"
          :matches="null"
          :partial="false"
        />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Rides route

The whole `/rides` page below the header: the log with its highlights, the
Routes grid, and the Records lists, switched by the view control beside the
title on a phone and in the sidebar on desktop.

Search opens from the icon at the right of the tools and filters every view in
place. The story book has no worker, so a search here filters the fixture rides
already on the page, which is also what the real page does until its index of
every ride lands. Units switch every figure between miles and kilometres.

The controls remount the route, as a fresh page load with those query
parameters would. Open the full-width link on a desktop to see the sidebar and
its months rail.
</docs>
