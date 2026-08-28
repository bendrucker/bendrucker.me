import { reactive, watch } from "vue";
import { actions } from "astro:actions";
import type { Repo, FilterState, ActivityState } from "@/activity/types";

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function actionInput(filters: FilterState) {
  return {
    sort: filters.sort === "recent" ? undefined : filters.sort,
    owner: filters.owner === "all" ? undefined : filters.owner,
    language: filters.language,
    search: filters.search || undefined,
    year: filters.year,
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
        ...actionInput(state.filters),
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
      const { data, error } = await actions.fetchRepos(
        actionInput(state.filters),
      );
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
      const { owner, search, year } = actionInput(state.filters);
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
      const { owner, language, search } = actionInput(state.filters);
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
          ...actionInput(state.filters),
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

  const debouncedReset = debounce(() => {
    resetAndFetch();
    fetchLanguages();
    fetchYears();
  }, 300);

  watch(
    () => ({ ...state.filters }),
    (newVal, oldVal) => {
      const searchChanged = oldVal && newVal.search !== oldVal.search;
      if (searchChanged) {
        debouncedReset();
      } else {
        resetAndFetch();
        fetchLanguages();
        fetchYears();
      }
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
