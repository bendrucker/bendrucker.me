<script setup lang="ts">
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
          <UnitsProvider :units="state.units">
            <HighlightsView :months="monthSets[state.months]!" />
          </UnitsProvider>
        </div>
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.months"
          title="months"
          :options="{
            season: 'two months',
            quiet: 'a quiet month',
            none: 'no months',
          }"
        />
        <HstSelect
          v-model="state.units"
          title="units"
          :options="['imperial', 'metric']"
        />
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
