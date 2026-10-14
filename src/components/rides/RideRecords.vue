<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import type { Units } from "@/components/cycling/types";
import EmptyState from "@/components/parts/EmptyState.vue";
import ItemRow from "@/components/parts/ItemRow.vue";
import SectionHead from "@/components/parts/SectionHead.vue";
import SelectControl from "@/components/parts/SelectControl.vue";
import TimelineGutter from "@/components/parts/TimelineGutter.vue";
import { climbFigure, distanceFigure, gutterSub } from "@/rides/format";
import { rideHref } from "@/rides/links";
import { isHilly, rankRecords, type Records } from "@/rides/rank";
import {
  ALL_TIME,
  fetchRecordsPage,
  fromRecordTuple,
  periodLabel,
  POWER_LADDER,
  type PeriodRecords,
  type RecordRow,
  type RecordsPage,
  type RecordTuple,
} from "@/rides/records";
import { fromTuple, type RideRow, type RideTuple } from "@/rides/rows";

const props = withDefaults(
  defineProps<{
    /** `all` or a year. */
    period: string;
    /** The period the page rendered, or null when it opened on another view. */
    initial: RecordsPage | null;
    units: Units;
    thisYear: string;
    /** The search, trimmed. Records then narrow to the rides it matches. */
    query?: string;
    /** The rides the search has matched so far. */
    matches?: readonly RideRow[];
    /** Whether `matches` holds every ride the search matches. */
    complete?: boolean;
    /** The server's records for the search it rendered with. */
    matchRecords?: Records<RideTuple> | null;
    /** The search the page rendered with. */
    renderedQuery?: string;
    /** Reads a period the page didn't render. The stories stand in for the worker. */
    load?: (period: string) => Promise<RecordsPage>;
  }>(),
  {
    query: "",
    matches: () => [],
    complete: true,
    matchRecords: null,
    renderedQuery: "",
    load: fetchRecordsPage,
  },
);

const emit = defineEmits<{ "update:period": [period: string]; clear: [] }>();

const periods = ref<string[] | null>(props.initial?.periods ?? null);
const cache = shallowRef(
  new Map<string, PeriodRecords>(
    props.initial === null
      ? []
      : [[props.initial.records.period, props.initial.records]],
  ),
);
const loading = ref(false);
const failed = ref(false);

/** The period on screen, which stays put while the next one loads. */
const shown = ref<PeriodRecords | null>(props.initial?.records ?? null);

let latest = "";

async function show(period: string) {
  const cached = cache.value.get(period);
  if (cached !== undefined) {
    shown.value = cached;
    failed.value = false;
    return;
  }
  latest = period;
  loading.value = true;
  failed.value = false;
  try {
    const page = await props.load(period);
    cache.value = new Map(cache.value).set(period, page.records);
    periods.value = page.periods;
    if (latest === period) shown.value = page.records;
  } catch {
    if (latest === period) failed.value = true;
  } finally {
    if (latest === period) loading.value = false;
  }
}

const searching = computed(() => props.query !== "");

onMounted(async () => {
  if (!searching.value) await show(props.period);
});

watch(
  () => [props.period, searching.value] as const,
  async ([period, isSearching]) => {
    if (!isSearching) await show(period);
  },
);

const options = computed(() =>
  (periods.value ?? [props.period]).map((value) => ({
    value,
    label: periodLabel(value),
  })),
);

interface ShownRow {
  /** One ride can hold several power bests, so the key isn't its id. */
  key: string;
  id: string;
  title: string;
  text?: string;
  day: string;
  figure?: string;
  hilly: boolean;
}

interface ShownList {
  key: string;
  label: string;
  rows: ShownRow[];
  /** What an empty list says in place of rows. */
  none: string;
}

const LADDER_LABELS = new Map<number, string>(
  POWER_LADDER.map(({ durationS, label }) => [durationS, label]),
);

function rows(
  tuples: RecordTuple[],
  figure: (row: RecordRow) => string | undefined,
): ShownRow[] {
  return tuples.map((tuple) => {
    const row = fromRecordTuple(tuple);
    return {
      key: row.id,
      id: row.id,
      title: row.name,
      day: row.day,
      figure: figure(row),
      hilly: isHilly(row),
    };
  });
}

function recordLists(records: PeriodRecords): ShownList[] {
  return [
    {
      key: "power",
      label: "Best power",
      none: "No power meter on any ride.",
      rows: records.power.map(([durationS, watts, id, name, day]) => ({
        key: String(durationS),
        id,
        title: LADDER_LABELS.get(durationS) ?? `${durationS} sec`,
        text: name,
        day,
        figure: `${watts} W`,
        hilly: false,
      })),
    },
    {
      key: "longest",
      label: "Longest rides",
      none: "No rides.",
      rows: rows(records.longest, (row) =>
        distanceFigure(row.distanceM, props.units),
      ),
    },
    {
      key: "climbing",
      label: "Most climbing",
      none: "No climbing.",
      rows: rows(records.climbing, (row) =>
        climbFigure(row.climbM, props.units),
      ),
    },
    {
      key: "climbs",
      label: "Biggest climbs",
      none: "No climbs.",
      rows: records.climbs.map(([id, position, climb, ride, day, gainM]) => {
        const shownRow: ShownRow = {
          key: `${id}:${position}`,
          id,
          title: climb ?? ride,
          day,
          figure: climbFigure(gainM, props.units),
          hilly: true,
        };
        if (climb !== null) shownRow.text = ride;
        return shownRow;
      }),
    },
  ];
}

const matchRecords = computed<Records<RideRow>>(() => {
  // The server ranked the search it rendered across every ride, which beats
  // ranking the first screen of results until the index lands.
  if (
    !props.complete &&
    props.matchRecords !== null &&
    props.query === props.renderedQuery.trim()
  ) {
    return {
      longest: props.matchRecords.longest.map((row) => fromTuple(row)),
      climbing: props.matchRecords.climbing.map((row) => fromTuple(row)),
    };
  }
  return rankRecords(props.matches);
});

function matchRows(
  list: RideRow[],
  figure: (row: RideRow) => string | undefined,
): ShownRow[] {
  return list.map((row) => ({
    key: row.id,
    id: row.id,
    title: row.name,
    day: row.day,
    figure: figure(row),
    hilly: isHilly(row),
  }));
}

function matchLists(records: Records<RideRow>): ShownList[] {
  return [
    {
      key: "longest",
      label: "Longest rides",
      none: "No rides.",
      rows: matchRows(records.longest, (row) =>
        distanceFigure(row.distanceM, props.units),
      ),
    },
    {
      key: "climbing",
      label: "Most climbing",
      none: "No climbing.",
      rows: matchRows(records.climbing, (row) =>
        climbFigure(row.climbM, props.units),
      ),
    },
  ];
}

const lists = computed<ShownList[]>(() => {
  if (searching.value) return matchLists(matchRecords.value);
  return shown.value === null ? [] : recordLists(shown.value);
});

const matchesNone = computed(
  () =>
    searching.value &&
    props.complete &&
    matchRecords.value.longest.length === 0 &&
    matchRecords.value.climbing.length === 0,
);

/** A year's rows name the month under the day, and all time's the year. */
const gutterYear = computed(() =>
  !searching.value && shown.value !== null && shown.value.period !== ALL_TIME
    ? shown.value.period
    : props.thisYear,
);

const heading = computed(() =>
  searching.value
    ? "Records among matches"
    : periodLabel(shown.value?.period ?? props.period),
);

function pick(value: string) {
  emit("update:period", value);
}
</script>

<template>
  <EmptyState
    v-if="matchesNone"
    noun="rides"
    :query="query"
    @clear="emit('clear')"
  />
  <div v-else :aria-busy="loading ? 'true' : undefined">
    <div class="flex items-center justify-between gap-3 pb-1">
      <SectionHead :label="heading" section />
      <SelectControl
        v-if="!searching"
        :model-value="period"
        :options="options"
        label="Period"
        icon="calendar"
        :tint="false"
        @update:model-value="pick"
      />
    </div>
    <!-- The picker leaves focus where it was, so the status line is what
         tells a screen reader the lists are on their way or failed. -->
    <div
      v-if="!searching && (loading || failed)"
      class="flex flex-wrap items-center gap-2 pb-2 pl-1"
    >
      <p role="status" class="font-mono text-xs text-dim">
        <template v-if="loading">Loading {{ periodLabel(period) }}</template>
        <template v-else>Couldn’t load {{ periodLabel(period) }}.</template>
      </p>
      <button
        v-if="failed"
        type="button"
        class="inline-flex min-h-9 items-center rounded-[10px] border border-line px-3 text-[13px] transition-colors hover:border-cat/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat"
        @click="show(period)"
      >
        Try again
      </button>
    </div>
    <div
      class="grid gap-x-6 gap-y-3 transition-opacity md:grid-cols-2"
      :class="loading && shown !== null ? 'opacity-60' : ''"
    >
      <section
        v-for="list in lists"
        :key="list.key"
        :aria-labelledby="`records-${list.key}`"
        class="min-w-0"
      >
        <SectionHead
          :id="`records-${list.key}`"
          :label="list.label"
          :level="3"
        />
        <p
          v-if="list.rows.length === 0"
          class="pb-2 pl-[34px] text-[13px] text-dim"
        >
          {{ list.none }}
        </p>
        <ol v-else role="list" class="flex flex-col gap-1.5">
          <li v-for="(row, index) in list.rows" :key="row.key">
            <ItemRow
              :href="rideHref(row.id, units)"
              :title="row.title"
              :text="row.text"
              :figure="row.figure"
              :hilly="row.hilly"
              :query="list.key === 'power' ? '' : query"
            >
              <template #gutter>
                <TimelineGutter
                  :day="String(Number(row.day.slice(8, 10)))"
                  :sub="gutterSub(row.day, gutterYear)"
                  :week-end="index === list.rows.length - 1"
                />
              </template>
            </ItemRow>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
