import { computed, ref, shallowRef, watch, type Ref } from "vue";
import { matches } from "@/activity/search";
import { fromTuple, rideIndex, type RideRow } from "@/rides/rows";

/** Where the browser fetches every ride from once a search starts. */
export const RIDE_INDEX_URL = "/activity/cycling/rides.json";

/** Results a search renders at once, and how many more each scroll adds. */
const FIRST_RESULTS = 60;
const MORE_RESULTS = 100;

export interface RideSearchSeed {
  /** The query the server rendered. */
  query: string;
  /** The rides the server found for it, newest first. */
  matches: RideRow[] | null;
  /** Whether more rides matched than the server sent. */
  partial: boolean;
}

export interface RideSearch {
  /** Every matching ride known so far, newest first. */
  results: Ref<RideRow[]>;
  /** The slice of `results` to render. */
  shown: Ref<RideRow[]>;
  /** Whether `results` holds every ride the query matches. */
  complete: Ref<boolean>;
  hasMore: Ref<boolean>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
  loadMore: () => Promise<void>;
}

async function fetchIndex(): Promise<RideRow[]> {
  const response = await fetch(RIDE_INDEX_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return rideIndex
    .parse(await response.json())
    .rides.map((row) => fromTuple(row));
}

/**
 * The route's search. The server renders the first screen of results for the
 * query in the URL. Once the reader types, the browser fetches every ride
 * once and filters from then on without a round trip. Until the index lands,
 * a new query filters the rides already on the page.
 */
export function useRideSearch(
  query: Ref<string>,
  seed: RideSearchSeed,
  loaded: Ref<RideRow[]>,
): RideSearch {
  const index = shallowRef<RideRow[] | null>(null);
  const loading = ref(false);
  const failed = ref(false);
  const limit = ref(FIRST_RESULTS);

  const trimmed = computed(() => query.value.trim());
  const seeded = computed(
    () => seed.matches !== null && trimmed.value === seed.query.trim(),
  );

  const pool = computed<RideRow[]>(() => {
    if (index.value !== null) return index.value;
    if (seeded.value && seed.matches !== null) return seed.matches;
    return loaded.value;
  });

  const results = computed(() =>
    trimmed.value === ""
      ? []
      : pool.value.filter((row) =>
          matches({ title: row.name, text: row.description }, trimmed.value),
        ),
  );

  const complete = computed(
    () => index.value !== null || (seeded.value && !seed.partial),
  );

  const shown = computed(() => results.value.slice(0, limit.value));

  async function ensureIndex(): Promise<void> {
    if (index.value !== null || loading.value) return;
    loading.value = true;
    failed.value = false;
    try {
      index.value = await fetchIndex();
    } catch {
      failed.value = true;
    } finally {
      loading.value = false;
    }
  }

  watch(trimmed, async (value) => {
    limit.value = FIRST_RESULTS;
    if (value !== "") await ensureIndex();
  });

  async function loadMore(): Promise<void> {
    if (index.value === null) {
      await ensureIndex();
      return;
    }
    limit.value += MORE_RESULTS;
  }

  return {
    results,
    shown,
    complete,
    hasMore: computed(
      () => shown.value.length < results.value.length || !complete.value,
    ),
    loading,
    failed,
    loadMore,
  };
}
