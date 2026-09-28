<script setup lang="ts">
import { watchDebounced } from "@vueuse/core";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
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
import {
  announceListSettled,
  currentListEntry,
  ensureListEntryId,
  saveListEntry,
} from "@/rides/listEntry";
import { isHilly, rankRecords, type Records } from "@/rides/rank";
import {
  fromTuple,
  rideRowsPage,
  type RideMonth,
  type RideRow,
  type RideTuple,
} from "@/rides/rows";
import RideSections from "./RideSections.vue";
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
  /** The first rides `q` matches, when there is one. */
  matches: RideTuple[] | null;
  partial: boolean;
}>();

const view = ref<RideView>(props.view);
const query = ref(props.q);
const units = ref<Units>(props.units);

const VIEWS: SegmentOption[] = [
  { value: "log", label: "Log", icon: "list" },
  { value: "records", label: "Records", icon: "trophy" },
];

function pickView(value: string) {
  view.value = parseView(value);
}

/** Set once the reader navigates away, after which the list owns no history entry. */
let leaving = false;

/** The list answers at `/rides/` too, which the sitemap names. */
function onList() {
  return location.pathname.replace(/\/$/, "") === "/rides";
}

const listHref = computed(() =>
  ridesHref({ view: view.value, q: query.value, units: units.value }),
);

function writeUrl() {
  if (leaving || !onList()) return;
  history.replaceState(history.state, "", listHref.value);
}

// Safari throttles `replaceState` to a hundred calls in ten seconds and throws
// past that, which a fast typist reaches. A write still pending when the
// reader opens a ride would land on the ride's entry, so leaving writes it at
// once and drops the pending one.
watchDebounced([view, query, units], writeUrl, { debounce: 250 });

async function fetchRows(before: string) {
  const response = await fetch(`/activity/cycling/${before}.json?format=rows`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return rideRowsPage.parse(await response.json());
}

const log = useMonthPages(props.months, props.logCursor, fetchRows);

// Leaving saves the months paged in and the scroll offset, and returning to
// the same history entry puts them back. The server renders two months, and a
// reader who paged a year back would otherwise come back to a page too short
// to hold their place.
//
// A traversal has already made the destination the current entry by the time
// the router announces it, so leaving that way writes nothing to history and
// saves under the id the list's entry was given when it was shown. Every entry
// gets its id then, so a list the reader reached by a push and left by Back
// still has one to save under.
let entryId: string | null = null;

function claimEntryId() {
  if (leaving || !onList()) return;
  entryId = ensureListEntryId();
}

function save(id: string) {
  saveListEntry({
    id,
    href: listHref.value,
    scrollY: window.scrollY,
    log: { months: log.months.value, logCursor: log.cursor.value },
  });
}

function onLeave(event: Event) {
  const traversal =
    "navigationType" in event && event.navigationType === "traverse";
  if (!traversal) writeUrl();
  leaving = true;
  const id = traversal ? entryId : ensureListEntryId();
  if (id !== null) save(id);
}

// A reload or a full page load elsewhere leaves without the router, and saves
// here instead. Otherwise the record would still hold the place the reader
// last left for a ride, and the reload would jump back to it.
function onPageHide() {
  if (leaving) return;
  writeUrl();
  const id = entryId ?? ensureListEntryId();
  if (id !== null) save(id);
}

onMounted(async () => {
  document.addEventListener("astro:before-preparation", onLeave);
  window.addEventListener("pagehide", onPageHide);
  const saved = currentListEntry();
  // The router gives a new entry its state before the page is shown, but on a
  // first load its script can run after the island mounts. Until it has, there
  // is no state to keep the id in, so the id waits for the page-load event.
  claimEntryId();
  if (entryId === null) {
    document.addEventListener("astro:page-load", claimEntryId, { once: true });
  }
  if (saved !== null) {
    if (saved.log.months.length > log.months.value.length) {
      log.restore(saved.log);
      await nextTick();
    }
    window.scrollTo({ top: saved.scrollY, behavior: "instant" });
  }
  announceListSettled();
});

onBeforeUnmount(() => {
  leaving = true;
  document.removeEventListener("astro:before-preparation", onLeave);
  document.removeEventListener("astro:page-load", claimEntryId);
  window.removeEventListener("pagehide", onPageHide);
});

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

const status = computed(() => {
  if (!searching.value) return "";
  const count = search.results.value.length;
  const noun = count === 1 ? "ride" : "rides";
  return search.complete.value
    ? `${count} ${noun}`
    : `More than ${count} ${noun}`;
});

const showHighlights = computed(
  () => view.value === "log" && !searching.value && highlights.value.length > 0,
);

// The log mounts the first time it is shown and stays mounted after. A page
// opened on records or a search skips rendering two months of rows it
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

/**
 * Empties the search from the empty state. The button that did it leaves with
 * the empty state, so focus moves to the search field the reader can start
 * over in rather than falling back to the top of the document. Both layouts
 * render a field and CSS shows one, so the visible one is the one with a box.
 */
async function clear() {
  query.value = "";
  await nextTick();
  const fields = document.querySelectorAll<HTMLInputElement>(
    '#main-content input[type="search"]',
  );
  [...fields].find((field) => field.getClientRects().length > 0)?.focus();
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
      <div class="tool-row">
        <UnitsToggle v-model="units" class="px-2.5" />
        <SearchControl
          v-model="query"
          noun="rides"
          collapsible
          :status="status"
          class="ml-auto"
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
      <SectionHead label="Highlights" section />
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="(ride, index) in highlights"
          :key="ride.id"
          :class="index >= 3 ? 'max-md:hidden' : ''"
        >
          <ItemRow
            :href="rideHref(ride.id, units)"
            :title="ride.name"
            :text="ride.description"
            :figure="distanceFigure(ride.distanceM, units)"
            :hilly="isHilly(ride)"
          />
        </li>
      </ul>
    </template>

    <!-- Once mounted, the log stays mounted behind the other views and behind a
         search, so the months it has paged in and the window's record of which
         are collapsed survive a trip away and back. -->
    <div v-if="logMounted" v-show="logShown" ref="logRoot">
      <SectionHead label="Recent" section />
      <RideSections
        :rows="logRows"
        :level="3"
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
                :text="ride.description"
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
