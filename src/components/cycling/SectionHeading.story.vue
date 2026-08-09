<script setup lang="ts">
import { computed } from "vue";
import { julyMonth, rankedLists } from "./fixtures";
import SectionHeading from "./SectionHeading.vue";
import { useUnits } from "./useUnits";

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();

const monthSummary = computed(
  () =>
    `${formatDistance(julyMonth.distanceMi)} ${distanceUnit.value} · ${formatElevation(julyMonth.elevationFt)} ${elevationUnit.value} · ${julyMonth.rideCount} rides`,
);
</script>

<template>
  <Story title="Cycling/Section heading" :layout="{ type: 'grid', width: 560 }">
    <Variant title="Month with summary">
      <SectionHeading :label="julyMonth.label" :summary="monthSummary" />
    </Variant>

    <Variant title="No summary">
      <SectionHeading :label="julyMonth.label" />
    </Variant>

    <Variant title="Ranked list (h3)">
      <SectionHeading
        :label="rankedLists[0]!.title"
        :icon="rankedLists[0]!.icon"
        as="h3"
      />
    </Variant>

    <Variant title="Plain span">
      <SectionHeading
        label="best power"
        icon="⚡"
        as="span"
        summary="last 90 days"
      />
    </Variant>

    <Variant title="Long label and summary">
      <SectionHeading
        label="september 2026 · the long way round"
        summary="1,284.6 mi · 112,400 ft · 61 rides · 9 commutes"
      />
    </Variant>

    <Variant title="Narrow container">
      <div class="w-56">
        <SectionHeading :label="julyMonth.label" :summary="monthSummary" />
      </div>
    </Variant>

    <Variant title="Stacked sections">
      <div class="flex flex-col gap-6">
        <SectionHeading
          v-for="list in rankedLists.slice(0, 3)"
          :key="list.id"
          :label="list.title"
          :icon="list.icon"
          as="h3"
          :summary="`${list.rows.length} rows`"
        />
      </div>
    </Variant>
  </Story>
</template>
