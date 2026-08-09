<script setup lang="ts">
import HighlightCard from "./HighlightCard.vue";
import SectionHeading from "./SectionHeading.vue";
import type { HighlightMonth } from "./types";
import { useUnits } from "./useUnits";

defineProps<{ months: HighlightMonth[] }>();

const MAP_WIDTH = 260;

/**
 * A route map is drawn at a pixel size rather than a fluid one, so the columns
 * are sized to it instead of the other way round. The extra two pixels are the
 * card's own border, which sits outside the map.
 */
const columns = `repeat(auto-fill, ${MAP_WIDTH + 2}px)`;

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();

function summary(month: HighlightMonth): string {
  return [
    `${formatDistance(month.distanceMi)} ${distanceUnit.value}`,
    `${formatElevation(month.elevationFt)} ${elevationUnit.value}`,
    `${month.rideCount} rides`,
  ].join(" · ");
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <p v-if="!months.length" class="text-[11px] text-foreground/70">
      nothing stood out yet
    </p>

    <!-- The base layer styles every `section` as the centred page column, and
         `mx-auto` on a flex item shrinks it to its content instead of filling
         the row, so the page metrics are undone here. -->
    <section
      v-for="month in months"
      :key="month.key"
      class="mx-0 max-w-none px-0"
    >
      <SectionHeading :label="month.label" :summary="summary(month)" as="h2" />

      <p
        v-if="!month.highlights.length"
        class="mt-2 text-[11px] text-foreground/70"
      >
        nothing stood out this month
      </p>
      <ul
        v-else
        role="list"
        class="mt-3 grid gap-3"
        :style="{ gridTemplateColumns: columns }"
      >
        <li v-for="highlight in month.highlights" :key="highlight.ride.id">
          <HighlightCard
            :highlight="highlight"
            :map-width="MAP_WIDTH"
            heading-as="h3"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
