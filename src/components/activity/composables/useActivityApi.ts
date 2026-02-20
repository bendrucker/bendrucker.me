import { reactive, watch } from "vue";
import { actions } from "astro:actions";

export interface Repo {
  name: string;
  owner: string;
  description: string;
  url: string;
  primaryLanguage: {
    name: string;
    color: string;
    extension: string | null;
  } | null;
  stargazerCount: number;
  createdAt: string | null;
  lastActivity: string;
  activitySummary: {
    prCount: number;
    reviewCount: number;
    issueCount: number;
    mergeCount: number;
    hasMergedPRs: boolean;
  };
  years: number[];
}

export interface Language {
  name: string;
  color: string;
  extension: string | null;
  count: number;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface FilterState {
  owner: "all" | "personal" | "external";
  language: string | null;
  search: string;
  sort: "recent" | "active" | "stars" | "name";
  year: number | null;
}

export interface ActivityState {
  repos: Repo[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  total: number;
  filters: FilterState;
  languages: Language[];
  years: YearCount[];
  currentYear: number | null;
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

function actionInput(filters: FilterState) {
  return {
    sort: filters.sort === "recent" ? undefined : filters.sort,
    owner:
      filters.owner === "all"
        ? undefined
        : (filters.owner as "personal" | "external"),
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
