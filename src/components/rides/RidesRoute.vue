<script setup lang="ts">
import { watchDebounced } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { matches as nameMatches } from "@/activity/search";
import { sectionLabel } from "@/activity/sections";
import { useMonthPages } from "@/components/cycling/useMonthPages";
import {
  scrollToSection,
  useScrollSpy,
} from "@/components/cycling/useScrollSpy";
import type { Units } from "@/components/cycling/types";
import EmptyState from "@/components/parts/EmptyState.vue";
import ItemRow from "@/components/parts/ItemRow.vue";
import RouteFrame from "@/components/parts/RouteFrame.vue";
import SearchControl from "@/components/parts/SearchControl.vue";
import SectionHead from "@/components/parts/SectionHead.vue";
import SegmentGroup, {
  type SegmentOption,
} from "@/components/parts/SegmentGroup.vue";
import TimelineGutter from "@/components/parts/TimelineGutter.vue";
import UnitsToggle from "@/components/parts/UnitsToggle.vue";
import { climbFigure, distanceFigure, gutterSub } from "@/rides/format";
import { parseView, rideHref, ridesHref, type RideView } from "@/rides/links";
import { isHilly, rankRecords, type Records } from "@/rides/rank";
import {
  fromRouteTuple,
  fromTuple,
  rideRowsPage,
  type RideMonth,
  type RideRow,
  type RideTuple,
  type RouteTuple,
} from "@/rides/rows";
import RideSections from "./RideSections.vue";
import RouteTile from "./RouteTile.vue";
import { useRideSearch } from "./useRideSearch";

const props = defineProps<{
  view: RideView;
  q: string;
  units: Units;
  thisYear: string;
  /** Up to five, biggest first. The last two are desktop's. */
  highlights: RideTuple[];
  /** The log's first months, newest first. */
  months: RideMonth[];
  logCursor: string | null;
  /** All-time records. */
  records: Records<RideTuple>;
  /** Records among the rides `q` matches, when there is one. */
  matchRecords: Records<RideTuple> | null;
  routes: RouteTuple[];
  /** The first rides `q` matches, when there is one. */
  matches: RideTuple[] | null;
  partial: boolean;
}>();

const view = ref<RideView>(props.view);
const query = ref(props.q);
const units = ref<Units>(props.units);

const VIEWS: SegmentOption[] = [
  { value: "log", label: "Log", icon: "list" },
  { value: "routes", label: "Routes", icon: "map" },
  { value: "records", label: "Records", icon: "trophy" },
];

function pickView(value: string) {
  view.value = parseView(value);
}

// Safari throttles `replaceState` to a hundred calls in ten seconds and throws
// past that, which a fast typist reaches.
watchDebounced(
  [view, query, units],
  () => {
    const href = ridesHref({
      view: view.value,
      q: query.value,
      units: units.value,
    });
    history.replaceState(history.state, "", href);
  },
  { debounce: 250 },
);

async function fetchRows(before: string) {
  const response = await fetch(`/activity/cycling/${before}.json?format=rows`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return rideRowsPage.parse(await response.json());
}

const log = useMonthPages(props.months, props.logCursor, fetchRows);

const logRows = computed(() =>
  log.months.value.flatMap((month) => month.rides.map((row) => fromTuple(row))),
);

const highlights = computed(() =>
  props.highlights.map((row) => fromTuple(row)),
);

/** Everything on the page already, for a new query to filter until the index lands. */
const onPage = computed(() => {
  const byId = new Map<string, RideRow>();
  for (const row of [...logRows.value, ...highlights.value]) {
    byId.set(row.id, row);
  }
  return [...byId.values()].toSorted((a, b) => b.day.localeCompare(a.day));
});

const search = useRideSearch(
  query,
  {
    query: props.q,
    matches: props.matches?.map((row) => fromTuple(row)) ?? null,
    partial: props.partial,
  },
  onPage,
);

const searching = computed(() => query.value.trim() !== "");

function decode(records: Records<RideTuple>): Records<RideRow> {
  return {
    longest: records.longest.map((row) => fromTuple(row)),
    climbing: records.climbing.map((row) => fromTuple(row)),
  };
}

const records = computed<Records<RideRow>>(() => {
  if (!searching.value) return decode(props.records);
  // The server ranked the query it rendered across every ride, which beats
  // ranking the first screen of results until the index lands.
  if (
    !search.complete.value &&
    props.matchRecords !== null &&
    query.value.trim() === props.q.trim()
  ) {
    return decode(props.matchRecords);
  }
  return rankRecords(search.results.value);
});

const RECORD_LISTS = [
  { key: "longest", label: "Longest", figure: "distance" },
  { key: "climbing", label: "Most climbing", figure: "climb" },
] as const;

const recordsEmpty = computed(
  () =>
    records.value.longest.length === 0 && records.value.climbing.length === 0,
);

const tiles = computed(() =>
  props.routes
    .map((row) => fromRouteTuple(row))
    .filter((tile) => nameMatches({ title: tile.name }, query.value)),
);

const status = computed(() => {
  if (!searching.value) return "";
  const count =
    view.value === "routes" ? tiles.value.length : search.results.value.length;
  const noun = count === 1 ? "ride" : "rides";
  return search.complete.value || view.value === "routes"
    ? `${count} ${noun}`
    : `More than ${count} ${noun}`;
});

const showHighlights = computed(
  () => view.value === "log" && !searching.value && highlights.value.length > 0,
);

// The log mounts the first time it is shown and stays mounted after. A page
// opened on routes, records, or a search skips rendering two months of rows it
// hides, which is most of the markup a search page would otherwise carry.
const logShown = computed(() => view.value === "log" && !searching.value);
const logMounted = ref(logShown.value);
watch(logShown, (shown) => {
  if (shown) logMounted.value = true;
});

const logRoot = ref<HTMLElement | null>(null);
const monthKeys = computed(() => log.months.value.map((month) => month.key));
const activeMonth = useScrollSpy(monthKeys, { root: logRoot });
const rail = computed(() =>
  monthKeys.value.map((key) => ({
    key,
    label: sectionLabel(key, "month", { thisYear: props.thisYear }),
  })),
);
const showRail = computed(
  () => view.value === "log" && !searching.value && rail.value.length > 1,
);

function clear() {
  query.value = "";
}

function figure(row: RideRow, kind: "distance" | "climb"): string {
  return kind === "distance"
    ? distanceFigure(row.distanceM, units.value)
    : climbFigure(row.climbM, units.value);
}
</script>

<template>
  <RouteFrame
    id="rides"
    :regions="{
      views: true,
      tools: true,
      sidebar: true,
      highlights: showHighlights,
    }"
  >
    <template #views>
      <SegmentGroup
        :model-value="view"
        :options="VIEWS"
        label="View"
        icon-only
        @update:model-value="pickView"
      />
    </template>

    <template #tools>
      <UnitsToggle v-model="units" form="segment" />
      <SearchControl
        v-model="query"
        noun="rides"
        collapsible
        :status="status"
        class="ml-auto"
      />
    </template>

    <template #sidebar>
      <div class="flex min-h-10 justify-end">
        <SearchControl
          v-model="query"
          noun="rides"
          collapsible
          :status="status"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <p class="px-1 label-caps">View</p>
        <SegmentGroup
          :model-value="view"
          :options="VIEWS"
          label="View"
          list
          @update:model-value="pickView"
        />
        <UnitsToggle v-model="units" class="mt-3 self-start px-2.5" />
      </div>
      <nav
        v-if="showRail"
        aria-label="Months"
        class="flex min-h-0 flex-col gap-1.5"
      >
        <p class="px-1 label-caps">Months</p>
        <ul class="flex max-h-[40vh] flex-col gap-0.5 overflow-y-auto">
          <li v-for="month in rail" :key="month.key">
            <button
              type="button"
              :aria-current="activeMonth === month.key ? 'true' : undefined"
              class="flex min-h-9 w-full items-center rounded-[7px] px-2.5 font-mono text-[13px] text-dim transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat aria-[current=true]:bg-background aria-[current=true]:text-cat aria-[current=true]:shadow-[0_1px_2px_var(--shadow)]"
              @click="scrollToSection(logRoot, month.key)"
            >
              {{ month.label }}
            </button>
          </li>
        </ul>
      </nav>
    </template>

    <template #highlights>
      <SectionHead label="Highlights" />
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="(ride, index) in highlights"
          :key="ride.id"
          :class="index >= 3 ? 'max-md:hidden' : ''"
        >
          <ItemRow
            :href="rideHref(ride.id, units)"
            :title="ride.name"
            :figure="distanceFigure(ride.distanceM, units)"
            :hilly="isHilly(ride)"
          >
            <template #gutter>
              <TimelineGutter
                :day="String(Number(ride.day.slice(8, 10)))"
                :sub="gutterSub(ride.day, thisYear)"
                :week-end="index === highlights.length - 1"
              />
            </template>
          </ItemRow>
        </li>
      </ul>
    </template>

    <!-- Once mounted, the log stays mounted behind the other views and behind a
         search, so the months it has paged in and the window's record of which
         are collapsed survive a trip away and back. -->
    <div v-if="logMounted" v-show="logShown" ref="logRoot">
      <RideSections
        :rows="logRows"
        :units="units"
        :this-year="thisYear"
        :has-more="log.hasMore.value"
        :loading="log.loading.value"
        :failed="log.failed.value"
        @load-more="log.loadMore"
      />
      <p
        v-if="logRows.length === 0"
        class="py-6 pl-[34px] text-[15px] text-dim"
      >
        No rides yet.
      </p>
    </div>

    <template v-if="view === 'log' && searching">
      <RideSections
        v-if="search.results.value.length > 0 || !search.complete.value"
        :rows="search.shown.value"
        :units="units"
        :this-year="thisYear"
        :query="query.trim()"
        :has-more="search.hasMore.value"
        :loading="search.loading.value"
        :failed="search.failed.value"
        pending="more rides"
        @load-more="search.loadMore"
      />
      <EmptyState v-else noun="rides" :query="query.trim()" @clear="clear" />
    </template>

    <template v-else-if="view === 'routes'">
      <ul
        v-if="tiles.length > 0"
        class="grid grid-cols-2 gap-2 pt-4 md:grid-cols-3 md:gap-3"
      >
        <li v-for="tile in tiles" :key="tile.id" class="min-w-0">
          <RouteTile
            :tile="tile"
            :href="rideHref(tile.id, units)"
            :figure="distanceFigure(tile.distanceM, units)"
            :hilly="isHilly(tile)"
          />
        </li>
      </ul>
      <EmptyState
        v-else-if="searching"
        noun="routes"
        :query="query.trim()"
        :gutter="false"
        @clear="clear"
      />
    </template>

    <template v-else-if="view === 'records'">
      <EmptyState
        v-if="searching && recordsEmpty && search.complete.value"
        noun="rides"
        :query="query.trim()"
        @clear="clear"
      />
      <template v-else>
        <section
          v-for="list in RECORD_LISTS"
          :key="list.key"
          :aria-label="list.label"
        >
          <SectionHead :label="list.label" />
          <ul class="flex flex-col gap-1.5">
            <li v-for="(ride, index) in records[list.key]" :key="ride.id">
              <ItemRow
                :href="rideHref(ride.id, units)"
                :title="ride.name"
                :figure="figure(ride, list.figure)"
                :hilly="isHilly(ride)"
                :query="query.trim()"
              >
                <template #gutter>
                  <TimelineGutter
                    :day="String(Number(ride.day.slice(8, 10)))"
                    :sub="gutterSub(ride.day, thisYear)"
                    :week-end="index === records[list.key].length - 1"
                  />
                </template>
              </ItemRow>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </RouteFrame>
</template>
