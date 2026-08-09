<script setup lang="ts">
import { ref } from "vue";
import { activity, powerBests, rankedLists } from "./fixtures";
import PrsView from "./PrsView.vue";
import UnitsProvider from "./UnitsProvider.vue";

const period = ref(activity.recordPeriods[0]!);
const emptyPeriod = ref("2024");

const measuredBests = powerBests.map((best, index) => ({
  ...best,
  watts: best.watts ?? [412, 348, 296, 254][index] ?? null,
}));
</script>

<template>
  <Story title="Cycling/PRs view" :layout="{ type: 'grid', width: 860 }">
    <Variant title="All periods">
      <div class="bg-background p-4 text-foreground">
        <PrsView
          :lists="activity.records[period] ?? []"
          :bests="measuredBests"
          :periods="activity.recordPeriods"
          :period="period"
          power-note="from rides with a power meter"
          @update:period="period = $event"
        />
      </div>
    </Variant>

    <Variant title="Metric units">
      <div class="bg-background p-4 text-foreground">
        <UnitsProvider units="metric">
          <PrsView
            :lists="rankedLists"
            :bests="powerBests"
            :periods="activity.recordPeriods"
            period="all"
          />
        </UnitsProvider>
      </div>
    </Variant>

    <Variant title="Nothing recorded">
      <div class="bg-background p-4 text-foreground">
        <PrsView
          :lists="[]"
          :bests="[]"
          :periods="['2024']"
          :period="emptyPeriod"
          @update:period="emptyPeriod = $event"
        />
      </div>
    </Variant>
  </Story>
</template>
