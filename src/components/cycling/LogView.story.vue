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

const paging: Record<
  string,
  { hasMore: boolean; loading: boolean; failed: boolean }
> = {
  done: { hasMore: false, loading: false, failed: false },
  more: { hasMore: true, loading: false, failed: false },
  loading: { hasMore: true, loading: true, failed: false },
  failed: { hasMore: true, loading: false, failed: true },
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
  paging: {
    type: "select",
    title: "paging",
    options: {
      done: "back to the first ride",
      more: "more to load",
      loading: "loading a page",
      failed: "a page failed",
    },
  },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
};

function initState() {
  return { months: "season", paging: "done", units: "imperial" };
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
              v-bind="paging[state.paging]!"
              @open-photo="
                (ride, index) =>
                  logEvent('openPhoto', { ride: ride.name, index })
              "
              @load-more="logEvent('loadMore', {})"
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

Opening a photo logs to the Events tab, and so does asking for another page.

The log pages backwards until it reaches the first ride. The paging control puts
that footer in each of its states: nothing to load, a page in flight, and a page
that failed with its retry button. Set it to "more to load" and scroll to the
bottom to see the sentinel ask for a page on its own.

The empty-month case is the one to check on a phone: a month that carried only
commutes still renders its heading.
</docs>
