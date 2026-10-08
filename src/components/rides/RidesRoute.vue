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
import { monthsByYear } from "@/activity/sections";
import { useMonthPages } from "@/components/cycling/useMonthPages";
import {
  scrollToSection,
  useScrollSpy,
} from "@/components/cycling/useScrollSpy";
import type { Units } from "@/components/cycling/types";
import EmptyState from "@/components/parts/EmptyState.vue";
import HighlightList from "@/components/parts/HighlightList.vue";
import RouteFrame from "@/components/parts/RouteFrame.vue";
import type { RouteNote } from "@/notes";
import SearchControl from "@/components/parts/SearchControl.vue";
import SectionHead from "@/components/parts/SectionHead.vue";
import SegmentGroup, {
  type SegmentOption,
} from "@/components/parts/SegmentGroup.vue";
import UnitsToggle from "@/components/parts/UnitsToggle.vue";
import { distanceFigure } from "@/rides/format";
import { parseView, rideHref, ridesHref, type RideView } from "@/rides/links";
import {
  announceListSettled,
  currentListEntry,
  ensureListEntryId,
  saveListEntry,
} from "@/rides/listEntry";
import { isHilly, type Records } from "@/rides/rank";
import type { RecordsPage } from "@/rides/records";
import {
  fromTuple,
  rideRowsPage,
  type RideMonth,
  type RideRow,
  type RideTuple,
} from "@/rides/rows";
import RideRecords from "./RideRecords.vue";
import DetailModal from "@/components/parts/DetailModal.vue";
import { useDetailModal, type OpenDetail } from "@/detail/useDetailModal";
import {
  fetchRideDetail,
  RIDE_PARAM,
  rideKey,
  type RideDetailWire,
} from "@/rides/detail";
import RideDetail from "./RideDetail.vue";
import RideSections from "./RideSections.vue";
import DateRail from "@/components/parts/DateRail.vue";
import { useRideSearch } from "./useRideSearch";

const props = defineProps<{
  /** The owner\'s note on the page. */
  note?: RouteNote;
  view: RideView;
  q: string;
  units: Units;
  thisYear: string;
  /** Up to five, biggest first. The last two are desktop's. */
  highlights: RideTuple[];
  /** The log's first months, newest first. */
  months: RideMonth[];
  logCursor: string | null;
  /** Every month with a ride, newest first, so the rail reaches unloaded ones. */
  allMonths: string[];
  /** The records' period, `all` or a year. */
  period: string;
  /** The period's records, when the page opened on them. */
  records: RecordsPage | null;
  /** Records among the rides `q` matches, when there is one. */
  matchRecords: Records<RideTuple> | null;
  /** The first rides `q` matches, when there is one. */
  matches: RideTuple[] | null;
  partial: boolean;
  /** The ride a shared link opened over the list, when it named one. */
  open?: OpenDetail<RideDetailWire> | null;
}>();

const view = ref<RideView>(props.view);
const query = ref(props.q);
const units = ref<Units>(props.units);
const period = ref(props.period);

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
  ridesHref({
    view: view.value,
    q: query.value,
    units: units.value,
    period: period.value,
  }),
);

// A ride opens over the list rather than replacing it, so the log keeps its
// months and its place underneath. Its row still links to its page.
const {
  key: openId,
  data: openRide,
  failed: openFailed,
  close: closeRide,
  restoreFocus,
  withOpen,
} = useDetailModal(
  { param: RIDE_PARAM, keyOf: rideKey, load: fetchRideDetail },
  props.open ?? null,
);

function writeUrl() {
  if (leaving || !onList()) return;
  history.replaceState(history.state, "", withOpen(listHref.value));
}

// Safari throttles `replaceState` to a hundred calls in ten seconds and throws
// past that, which a fast typist reaches. A write still pending when the
// reader opens a ride would land on the ride's entry, so leaving writes it at
// once and drops the pending one.
watchDebounced([view, query, units, period], writeUrl, { debounce: 250 });

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

const highlightRows = computed(() =>
  highlights.value.map((ride) => ({
    href: rideHref(ride.id, units.value),
    title: ride.name,
    text: ride.description,
    figure: distanceFigure(ride.distanceM, units.value),
    hilly: isHilly(ride),
  })),
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

// A page opened on records or a search skips rendering two months of rows it
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
  monthsByYear(props.allMonths.length > 0 ? props.allMonths : monthKeys.value),
);
const showRail = computed(
  () =>
    view.value === "log" &&
    !searching.value &&
    rail.value.flatMap((group) => group.months).length > 1,
);

const jumping = ref(false);

/** Pages the log back until `key` is loaded, then jumps to it. */
async function jumpTo(key: string) {
  jumping.value = true;
  try {
    while (!monthKeys.value.includes(key) && log.hasMore.value) {
      await log.loadMore();
      if (log.failed.value) return;
    }
    await nextTick();
    scrollToSection(logRoot.value, key);
  } finally {
    jumping.value = false;
  }
}

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
</script>

<template>
  <RouteFrame
    id="rides"
    :note="note"
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
      <DateRail
        v-if="showRail"
        :years="rail"
        :active="activeMonth ?? monthKeys[0] ?? null"
        :busy="jumping"
        @jump="jumpTo"
      />
    </template>

    <template #highlights>
      <HighlightList :rows="highlightRows" />
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

    <RideRecords
      v-else-if="view === 'records'"
      v-model:period="period"
      :initial="records"
      :units="units"
      :this-year="thisYear"
      :query="query.trim()"
      :matches="search.results.value"
      :complete="search.complete.value"
      :match-records="matchRecords"
      :rendered-query="q"
      @clear="clear"
    />

    <DetailModal
      :open="openId !== null"
      :label="openRide?.name ?? 'Ride'"
      noun="ride"
      :full-href="openId === null ? undefined : rideHref(openId, units)"
      :close-href="listHref"
      :loading="openRide === null"
      :failed="openFailed"
      hero
      @close="closeRide"
      @closed="restoreFocus"
    >
      <RideDetail
        v-if="openRide"
        :ride="openRide"
        :units="units"
        :this-year="thisYear"
        :level="2"
      />
    </DetailModal>
  </RouteFrame>
</template>
