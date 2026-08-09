<script setup lang="ts">
import { months } from "./fixtures";
import YearSummary from "./YearSummary.vue";

const season = months.reduce(
  (totals, month) => ({
    distanceMi: totals.distanceMi + month.distanceMi,
    elevationFt: totals.elevationFt + month.elevationFt,
    rideCount: totals.rideCount + month.rideCount,
  }),
  { distanceMi: 0, elevationFt: 0, rideCount: 0 },
);
</script>

<template>
  <Story title="Cycling/Year summary" :layout="{ type: 'grid', width: 720 }">
    <Variant title="With note">
      <YearSummary
        :year="2026"
        :distance-mi="season.distanceMi"
        :elevation-ft="season.elevationFt"
        :ride-count="season.rideCount"
        note="rides since may"
      />
    </Variant>

    <Variant title="Without note">
      <YearSummary
        :year="2026"
        :distance-mi="season.distanceMi"
        :elevation-ft="season.elevationFt"
        :ride-count="season.rideCount"
      />
    </Variant>

    <Variant title="Six-figure totals">
      <YearSummary
        :year="2025"
        :distance-mi="14382.6"
        :elevation-ft="1204877"
        :ride-count="1348"
        note="rides, commutes included"
      />
    </Variant>

    <Variant title="Narrow column">
      <div class="max-w-[300px]">
        <YearSummary
          :year="2026"
          :distance-mi="14382.6"
          :elevation-ft="1204877"
          :ride-count="1348"
          note="rides, commutes included"
        />
      </div>
    </Variant>
  </Story>
</template>
