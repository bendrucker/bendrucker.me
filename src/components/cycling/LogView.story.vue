<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { logEvent } from "histoire/client";
import { juneMonth, months } from "./fixtures";
import LogView from "./LogView.vue";
import type { MonthGroup } from "@/activity/types";
import UnitsProvider from "./UnitsProvider.vue";

const emptyMonth: MonthGroup = {
  ...juneMonth,
  rides: [],
  commuteCount: 1,
};

const monthSets: Record<string, MonthGroup[]> = {
  season: months,
  empty: [emptyMonth],
  none: [],
};

const controls: StoryControlSet = {
  months: {
    type: "select",
    title: "months",
    options: {
      season: "five months of rides",
      empty: "a month with no cards",
      none: "no months",
    },
  },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
};

function initState() {
  return { months: "season", units: "imperial" };
}
</script>

<template>
  <Story
    title="Log view"
    group="cycling-views"
    auto-props-disabled
    responsive-disabled
    :layout="{ type: 'single', iframe: true }"
    :init-state="initState"
  >
    <Variant title="Log view">
      <template #default="{ state }">
        <div class="min-h-screen bg-background p-4 pb-[60vh] text-foreground">
          <PreviewControls :controls="controls" :state="state" />
          <UnitsProvider :units="state.units">
            <LogView
              :months="monthSets[state.months]!"
              @open-photo="
                (ride, index) =>
                  logEvent('openPhoto', { ride: ride.name, index })
              "
            />
          </UnitsProvider>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Log view

Rides grouped by month, each month headed by its own totals.

Opening a photo logs to the Events tab. The empty-month case is the one to check
on a phone: a month that carried only commutes still renders its heading.
</docs>
