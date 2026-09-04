import { refDebounced, useDebounceFn } from "@vueuse/core";
import { computed, reactive, watch } from "vue";
import { actions } from "astro:actions";
import type { Repo, ActivityState } from "@/activity/types";

// `useDebounceFn` returns a promisified wrapper. Callers here fire and forget,
// so this keeps the original signature by discarding that promise.
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  const debounced = useDebounceFn(fn, ms);
  return (...args: A) => {
    void debounced(...args);
  };
}

export function useActivityApi(
  initialRepos: Repo[],
  initialTotal: number,
  initialHasMore: boolean,
  initialCursor: string | null,
) {
  const state = reactive<ActivityState>({
    repos: [...initialRepos],
    cursor: initialCursor,
    hasMore: initialHasMore,
    loading: false,
    total: initialTotal,
    filters: {
      owner: "all",
      language: null,
      search: "",
      sort: "recent",
      year: null,
    },
    languages: [],
    years: [],
    currentYear: null,
  });

  let prefetchedData: {
    cursor: string;
    repos: Repo[];
    nextCursor: string | null;
    hasMore: boolean;
  } | null = null;

  async function fetchRepos() {
    if (state.loading || !state.hasMore) return;

    if (prefetchedData && prefetchedData.cursor === state.cursor) {
      state.repos.push(...prefetchedData.repos);
      state.cursor = prefetchedData.nextCursor;
      state.hasMore = prefetchedData.hasMore;
      prefetchedData = null;
      prefetchNext();
      return;
    }

    state.loading = true;
    try {
      const { data, error } = await actions.fetchRepos({
        ...state.filters,
        cursor: state.cursor,
      });
      if (error) throw error;
      state.repos.push(...data.repos);
      state.cursor = data.nextCursor;
      state.hasMore = data.hasMore;
      state.total = data.total;
    } finally {
      state.loading = false;
    }
  }

  async function resetAndFetch() {
    state.repos = [];
    state.cursor = null;
    state.hasMore = true;
    prefetchedData = null;
    state.loading = true;
    try {
      const { data, error } = await actions.fetchRepos({ ...state.filters });
      if (error) throw error;
      state.repos = data.repos;
      state.cursor = data.nextCursor;
      state.hasMore = data.hasMore;
      state.total = data.total;
      if (state.filters.sort === "recent" && data.repos.length > 0) {
        state.currentYear = new Date(data.repos[0].lastActivity).getFullYear();
      } else if (state.filters.sort !== "recent") {
        state.currentYear = new Date().getFullYear();
      }
    } finally {
      state.loading = false;
    }
  }

  async function fetchLanguages() {
    try {
      const { owner, search, year } = state.filters;
      const { data, error } = await actions.fetchLanguages({
        owner,
        search,
        year,
      });
      if (error) return;
      state.languages = data.languages;
    } catch {
      // Non-critical: language bar is supplemental
    }
  }

  async function fetchYears() {
    try {
      const { owner, language, search } = state.filters;
      const { data, error } = await actions.fetchYears({
        owner,
        language,
        search,
      });
      if (error) return;
      state.years = data.years;
    } catch {
      // Non-critical: year navigation is supplemental
    }
  }

  function prefetchNext() {
    if (!state.hasMore || !state.cursor) return;
    const cursor = state.cursor;
    const schedule =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 100);
    schedule(async () => {
      try {
        const { data, error } = await actions.fetchRepos({
          ...state.filters,
          cursor,
        });
        if (error) return;
        prefetchedData = {
          cursor,
          repos: data.repos,
          nextCursor: data.nextCursor,
          hasMore: data.hasMore,
        };
      } catch {
        // Non-critical: prefetch failure does not block the UI
      }
    });
  }

  // A watcher callback, so nothing is here to await the three reloads. The
  // supplemental two swallow their own failures. A failed repo reload leaves
  // the list empty, which is what the caller would have rendered anyway.
  function refresh() {
    void resetAndFetch();
    void fetchLanguages();
    void fetchYears();
  }

  // Only the search box benefits from waiting out keystrokes, so its value is
  // debounced separately and the immediate watch below defers to it whenever
  // search is part of the change.
  const debouncedSearch = refDebounced(
    computed(() => state.filters.search),
    300,
  );
  watch(debouncedSearch, refresh);

  watch(
    () => ({ ...state.filters }),
    (newVal, oldVal) => {
      const searchChanged = oldVal && newVal.search !== oldVal.search;
      if (!searchChanged) refresh();
    },
    { deep: true },
  );

  return {
    state,
    fetchRepos,
    resetAndFetch,
    fetchLanguages,
    fetchYears,
    prefetchNext,
  };
}
