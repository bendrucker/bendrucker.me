<script setup lang="ts">
import { activity, powerBests } from "./fixtures";
import PrsView from "./PrsView.vue";
import type { RankedList } from "./types";
import UnitsProvider from "./UnitsProvider.vue";

const periods = activity.records.map((entry) => entry.period);

function listsFor(period: string): RankedList[] {
  return activity.records.find((entry) => entry.period === period)?.lists ?? [];
}

const measuredBests = powerBests.map((best, index) => ({
  ...best,
  watts: best.watts ?? [412, 348, 296, 254][index] ?? null,
}));

function initState() {
  return { period: periods[0]!, units: "imperial", power: "measured" };
}
</script>

<template>
  <Story
    title="PRs view"
    group="cycling-views"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="PRs view" :init-state="initState">
      <template #default="{ state }">
        <div class="bg-background p-4 text-foreground">
          <UnitsProvider :units="state.units">
            <PrsView
              :lists="listsFor(state.period)"
              :bests="state.power === 'measured' ? measuredBests : powerBests"
              :periods="periods"
              :period="state.period"
              power-note="from rides with a power meter"
              @update:period="state.period = $event"
            />
          </UnitsProvider>
        </div>
      </template>

      <template #controls="{ state }">
        <HstSelect v-model="state.period" title="period" :options="periods" />
        <HstSelect
          v-model="state.units"
          title="units"
          :options="['imperial', 'metric']"
        />
        <HstSelect
          v-model="state.power"
          title="power"
          :options="{
            measured: 'all durations',
            partial: 'ride average only',
          }"
        />
      </template>
    </Variant>

    <Variant title="Nothing recorded">
      <div class="bg-background p-4 text-foreground">
        <PrsView :lists="[]" :bests="[]" :periods="['2024']" period="2024" />
      </div>
    </Variant>
  </Story>
</template>

<docs lang="md">
# PRs view

Ranked lists and power bests for one period, with the period picker above them.

The picker is the view's own, so changing the period in the panel and tapping it
on the page are the same thing. 2025 carries fewer lists than 2026, which is the
case worth looking at.
</docs>
