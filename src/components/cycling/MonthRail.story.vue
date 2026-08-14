<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { months } from "./fixtures";
import { formatMonthKey } from "./format";
import MonthRail from "./MonthRail.vue";
import MonthRailScrollDemo from "./MonthRailScrollDemo.vue";

const season = months.map(({ key, label }) => ({ key, label }));

const severalYears = [
  "2026-07",
  "2026-06",
  "2026-05",
  "2026-04",
  "2026-03",
  "2025-12",
  "2025-11",
  "2025-10",
  "2025-09",
  "2025-08",
  "2024-11",
  "2024-10",
].map((key) => ({ key, label: formatMonthKey(key) }));

const monthSets: Record<string, { key: string; label: string }[]> = {
  season,
  severalYears,
  single: season.slice(0, 1),
  none: [],
};

const monthOptions = {
  season: "one season",
  severalYears: "several years",
  single: "a single month",
  none: "no months",
};

const monthControl: StoryControlSet = {
  months: { type: "select", title: "months", options: monthOptions },
};

const fixedControls: StoryControlSet = {
  ...monthControl,
  active: {
    type: "select",
    title: "active month",
    options: { first: "the first month", none: "nothing active" },
  },
};

function initState() {
  return { months: "season", active: "first" };
}
</script>

<template>
  <!-- Single layout renders each variant in its own full-height frame. A grid
       cell cannot hold the rail: it is fixed, so it would pin itself to the
       Histoire window and float over the UI. The frame also gives the scroll
       spy a real scrolling viewport to observe against. -->
  <Story
    title="Month rail"
    group="cycling-views"
    auto-props-disabled
    :layout="{ type: 'single', iframe: true }"
    :init-state="initState"
  >
    <Variant title="Scroll spy">
      <template #default="{ state }">
        <div class="bg-background px-4 pt-4">
          <PreviewControls :controls="monthControl" :state="state" />
        </div>
        <MonthRailScrollDemo :months="monthSets[state.months]!" />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="monthControl" :state="state" />
      </template>
    </Variant>

    <Variant title="Fixed state">
      <template #default="{ state }">
        <div
          class="bg-background px-4 py-6 text-[11px] text-foreground/70 sm:pr-16"
        >
          <PreviewControls :controls="fixedControls" :state="state" />
          the rail with its active month set by hand, rather than by scrolling.
          <MonthRail
            :months="monthSets[state.months]!"
            :active-key="
              state.active === 'first'
                ? (monthSets[state.months]![0]?.key ?? null)
                : null
            "
          />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="fixedControls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Month rail

The fixed month index down the side of the log.

Scroll spy is the real thing: scroll the frame and watch the active month track
the sections. Fixed state pins the active month instead, which is how the empty
and single-month cases are easiest to read.

The rail is `hidden sm:flex`, so it renders nothing below 640px. This story
keeps the responsive preview rather than fitting the pane, since a phone-width
frame would leave it correctly blank and unreviewable.
</docs>
