<script setup lang="ts">
import { computed, ref } from "vue";
import MonthRail from "./MonthRail.vue";
import RideCard from "./RideCard.vue";
import SectionHeading from "./SectionHeading.vue";
import type { MonthGroup, Ride } from "./types";
import { scrollToSection, useScrollSpy } from "./useScrollSpy";
import { useUnits } from "./useUnits";

const props = defineProps<{ months: MonthGroup[] }>();

defineEmits<{ openPhoto: [ride: Ride, index: number] }>();

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();

const root = ref<HTMLElement | null>(null);
const keys = computed(() => props.months.map((month) => month.key));
const activeKey = useScrollSpy(keys, { root });

function summary(month: MonthGroup): string {
  return [
    `${formatDistance(month.distanceMi)} ${distanceUnit.value}`,
    `${formatElevation(month.elevationFt)} ${elevationUnit.value}`,
    `${month.rideCount} rides`,
  ].join(" · ");
}
</script>

<template>
  <div ref="root" class="flex flex-col gap-8 sm:pr-14">
    <p v-if="!months.length" class="text-[11px] text-foreground/70">
      no rides logged yet
    </p>

    <!-- The base layer styles every `section` as the centred page column, and
         `mx-auto` on a flex item shrinks it to its content instead of filling
         the row, so the page metrics are undone here. -->
    <section
      v-for="month in months"
      :key="month.key"
      :data-month-key="month.key"
      tabindex="-1"
      class="mx-0 max-w-none scroll-mt-4 px-0"
    >
      <SectionHeading :label="month.label" :summary="summary(month)" as="h2" />

      <ul
        v-if="month.rides.length"
        role="list"
        class="mt-3 flex flex-col gap-3"
      >
        <li v-for="ride in month.rides" :key="ride.id">
          <RideCard
            :ride="ride"
            heading-as="h3"
            @open-photo="$emit('openPhoto', ride, $event)"
          />
        </li>
      </ul>

      <p v-if="month.commuteCount" class="mt-2 text-[11px] text-foreground/70">
        + {{ month.commuteCount }}
        {{ month.commuteCount === 1 ? "commute" : "commutes" }}
      </p>
    </section>

    <MonthRail
      :months="months"
      :active-key="activeKey"
      @navigate="scrollToSection(root, $event)"
    />
  </div>
</template>
