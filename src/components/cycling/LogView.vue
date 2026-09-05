<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import MonthRail from "./MonthRail.vue";
import RideCard from "./RideCard.vue";
import SectionHeading from "./SectionHeading.vue";
import type { MonthGroup, Ride } from "@/activity/types";
import { scrollToSection, useScrollSpy } from "./useScrollSpy";
import { useUnits } from "./useUnits";

const props = withDefaults(
  defineProps<{
    months: MonthGroup[];
    hasMore?: boolean;
    loading?: boolean;
    failed?: boolean;
  }>(),
  { hasMore: false, loading: false, failed: false },
);

const emit = defineEmits<{
  openPhoto: [ride: Ride, index: number];
  loadMore: [];
}>();

const { formatCommuteTotals, formatMonthSummary } = useUnits();

const root = ref<HTMLElement | null>(null);
const keys = computed(() => props.months.map((month) => month.key));
const activeKey = useScrollSpy(keys, { root });

/** How far below the fold a page starts loading, in pixels. */
const SENTINEL_MARGIN = 200;

const sentinel = ref<HTMLElement | null>(null);
const intersecting = ref(false);

// A failed page stops the automatic loading, since the sentinel stays on
// screen and would otherwise repeat the request that just failed. The retry
// button is the way out.
function request() {
  if (intersecting.value && props.hasMore && !props.loading && !props.failed) {
    emit("loadMore");
  }
}

useIntersectionObserver(
  sentinel,
  (entries) => {
    intersecting.value = entries[0]?.isIntersecting ?? false;
    request();
  },
  { rootMargin: `${SENTINEL_MARGIN}px` },
);

// A page that lands without pushing the sentinel off screen crosses no
// boundary, so the observer stays quiet and loading would stall.
watch(
  () => props.loading,
  (loading) => {
    if (loading) return;
    intersecting.value = withinMargin(sentinel.value);
    request();
  },
  { flush: "post" },
);

function withinMargin(element: HTMLElement | null): boolean {
  if (element === null) return false;
  const { top, bottom } = element.getBoundingClientRect();
  return (
    bottom >= -SENTINEL_MARGIN && top <= window.innerHeight + SENTINEL_MARGIN
  );
}
</script>

<template>
  <div ref="root" class="flex flex-col gap-8 sm:pr-14">
    <p v-if="!months.length" class="text-[11px] text-foreground/70">
      no rides logged yet
    </p>

    <section
      v-for="month in months"
      :key="month.key"
      :data-month-key="month.key"
      :aria-label="month.label"
      tabindex="-1"
      class="scroll-mt-4"
    >
      <SectionHeading
        :label="month.label"
        :summary="formatMonthSummary(month)"
        as="h2"
      />

      <ul
        v-if="month.rides.length"
        role="list"
        class="mt-3 flex flex-col gap-3"
      >
        <li v-for="ride in month.rides" :key="ride.id">
          <RideCard
            :ride="ride"
            heading-as="h3"
            @open-photo="emit('openPhoto', ride, $event)"
          />
        </li>
      </ul>

      <p v-if="month.commutes" class="mt-2 text-[11px] text-foreground/70">
        + {{ month.commutes.count }}
        {{ month.commutes.count === 1 ? "commute" : "commutes" }}
        ({{ formatCommuteTotals(month.commutes) }})
      </p>
    </section>

    <!-- The log stops at the first ride, so this whole block goes with the
         last page and there is no end-of-log marker to leave behind. -->
    <div
      v-if="hasMore || loading || failed"
      class="flex flex-col items-start gap-2"
    >
      <div ref="sentinel" aria-hidden="true" class="h-px w-full"></div>

      <p role="status" class="text-[11px] text-foreground/70">
        <template v-if="loading">loading earlier months</template>
        <template v-else-if="failed">could not load earlier months</template>
      </p>

      <button
        v-if="failed"
        type="button"
        class="rounded-md border border-border px-2 py-0.5 text-[11px] text-foreground/70 transition-colors hover:text-foreground"
        @click="emit('loadMore')"
      >
        retry
      </button>
    </div>

    <MonthRail
      :months="months"
      :active-key="activeKey"
      @navigate="scrollToSection(root, $event)"
    />
  </div>
</template>
