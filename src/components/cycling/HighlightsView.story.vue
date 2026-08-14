<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { highlightMonths } from "./fixtures";
import HighlightsView from "./HighlightsView.vue";
import type { HighlightMonth } from "./types";
import UnitsProvider from "./UnitsProvider.vue";

const quietMonth: HighlightMonth = {
  ...highlightMonths[0]!,
  highlights: [],
};

const monthSets: Record<string, HighlightMonth[]> = {
  season: highlightMonths,
  quiet: [quietMonth],
  none: [],
};

const controls: StoryControlSet = {
  months: {
    type: "select",
    title: "months",
    options: {
      season: "two months",
      quiet: "a quiet month",
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
    title="Highlights view"
    group="cycling-views"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
    :init-state="initState"
  >
    <Variant title="Highlights view">
      <template #default="{ state }">
        <div class="bg-background p-4 text-foreground">
          <PreviewControls :controls="controls" :state="state" />
          <UnitsProvider :units="state.units">
            <HighlightsView :months="monthSets[state.months]!" />
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
# Highlights view

The notable rides of each month, one card apiece.

A month whose highlights were all filtered out still carries its heading and
totals, which is what the quiet month proves.
</docs>
