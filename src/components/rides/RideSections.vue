<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { groupRows } from "@/activity/sections";
import { useMonthWindow } from "@/components/cycling/useMonthWindow";
import type { Units } from "@/components/cycling/types";
import ItemRow from "@/components/parts/ItemRow.vue";
import SectionHead from "@/components/parts/SectionHead.vue";
import TimelineGutter from "@/components/parts/TimelineGutter.vue";
import { distanceFigure } from "@/rides/format";
import { rideHref } from "@/rides/links";
import { isHilly } from "@/rides/rank";
import type { RideRow } from "@/rides/rows";

const props = withDefaults(
  defineProps<{
    /** Newest first. */
    rows: RideRow[];
    units: Units;
    /** The year section labels leave unsaid. */
    thisYear: string;
    /** The search to mark in each title. */
    query?: string;
    hasMore?: boolean;
    loading?: boolean;
    failed?: boolean;
    /** What the loading line says is on its way: "earlier months". */
    pending?: string;
    /** The month headings' level, 3 when a section heading sits above them. */
    level?: 2 | 3;
  }>(),
  {
    query: "",
    hasMore: false,
    loading: false,
    failed: false,
    pending: "earlier months",
    level: 2,
  },
);

const emit = defineEmits<{ loadMore: [] }>();

const sections = computed(() =>
  groupRows(props.rows, "month", { thisYear: props.thisYear }),
);

const root = ref<HTMLElement | null>(null);
const keys = computed(() => sections.value.map((section) => section.key));
const monthWindow = useMonthWindow(keys, { root });

defineExpose({ root });

/** How far below the fold the next page starts loading, in pixels. */
const SENTINEL_MARGIN = 400;

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

// A page that lands without pushing the sentinel off screen never crosses the
// observer's threshold, so the observer stays quiet and loading would stall. The same goes
// for rows added without a request, which is how search pages its results.
watch(
  [() => props.loading, () => props.rows.length],
  ([loading]) => {
    if (loading) return;
    intersecting.value = withinMargin(sentinel.value);
    request();
  },
  { flush: "post" },
);

function withinMargin(element: HTMLElement | null): boolean {
  if (element === null) return false;
  const { top, bottom, width, height } = element.getBoundingClientRect();
  // A log hidden behind another view measures at zero, which sits inside the
  // margin and would page the rest of the archive one request at a time.
  if (width === 0 && height === 0) return false;
  return (
    bottom >= -SENTINEL_MARGIN && top <= window.innerHeight + SENTINEL_MARGIN
  );
}
</script>

<template>
  <div ref="root">
    <!-- A month far from the viewport holds its measured height and nothing
         else, so the page keeps its length and the reader keeps their place
         while the rows themselves are released. -->
    <section
      v-for="section in sections"
      :key="section.key"
      :data-month-key="section.key"
      :aria-label="section.label"
      tabindex="-1"
      class="scroll-mt-16 outline-none md:scroll-mt-6"
      :style="
        monthWindow.holds(section.key)
          ? undefined
          : { minHeight: `${monthWindow.reserved(section.key)}px` }
      "
    >
      <SectionHead :label="section.label" :level="level" />
      <template v-if="monthWindow.holds(section.key)">
        <ul
          v-for="week in section.weeks"
          :key="week.key"
          class="flex flex-col gap-1.5 not-first-of-type:mt-3"
        >
          <li v-for="(row, index) in week.rows" :key="row.item.id">
            <ItemRow
              :href="rideHref(row.item.id, units)"
              :title="row.item.name"
              :text="row.item.description"
              :figure="distanceFigure(row.item.distanceM, units)"
              :hilly="isHilly(row.item)"
              :query="query"
            >
              <template #gutter>
                <TimelineGutter
                  :day="row.dayNum"
                  :show-day="row.showDay"
                  :week-end="index === week.rows.length - 1"
                />
              </template>
            </ItemRow>
          </li>
        </ul>
      </template>
    </section>

    <!-- The log stops at the first ride, so this whole block goes with the
         last page and there is no end-of-log marker to leave behind. -->
    <div
      v-if="hasMore || loading || failed"
      class="flex flex-col items-start gap-2 pt-4 pl-[34px]"
    >
      <div ref="sentinel" aria-hidden="true" class="h-px w-full" />
      <p role="status" class="font-mono text-xs text-dim">
        <template v-if="loading">Loading {{ pending }}</template>
        <template v-else-if="failed">Couldn’t load {{ pending }}.</template>
      </p>
      <button
        v-if="failed"
        type="button"
        class="inline-flex min-h-9 items-center rounded-[10px] border border-line px-3 text-[13px] transition-colors hover:border-cat/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat"
        @click="emit('loadMore')"
      >
        Try again
      </button>
    </div>
  </div>
</template>
