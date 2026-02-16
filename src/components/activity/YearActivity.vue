<script setup lang="ts">
import { computed, onMounted, reactive, watch } from "vue";
import { actions } from "astro:actions";
import {
  type Repo,
  type Language,
  type YearCount,
  type FilterState,
  debounce,
} from "./composables/useActivityApi";
import FilterControls from "./FilterControls.vue";
import LanguageBar from "./LanguageBar.vue";
import RepoCard from "./RepoCard.vue";
import LoadingPulse from "./LoadingPulse.vue";

const props = defineProps<{
  initialRepos: Repo[];
  initialTotal: number;
  year: number;
  years: YearCount[];
  username: string;
}>();

const state = reactive<{
  repos: Repo[];
  loading: boolean;
  total: number;
  filters: FilterState;
  languages: Language[];
}>({
  repos: [...props.initialRepos],
  loading: false,
  total: props.initialTotal,
  filters: {
    owner: "all",
    language: null,
    search: "",
    sort: "recent",
    year: props.year,
  },
  languages: [],
});

function actionInput() {
  return {
    sort: state.filters.sort === "recent" ? undefined : state.filters.sort,
    owner: state.filters.owner === "all" ? undefined : (state.filters.owner as "personal" | "external"),
    language: state.filters.language,
    search: state.filters.search || undefined,
    year: state.filters.year,
  };
}

const prevYear = computed(() => {
  const sorted = props.years.map((y) => y.year).sort((a, b) => b - a);
  const idx = sorted.indexOf(props.year);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
});

const nextYear = computed(() => {
  const sorted = props.years.map((y) => y.year).sort((a, b) => b - a);
  const idx = sorted.indexOf(props.year);
  return idx > 0 ? sorted[idx - 1] : null;
});

const MAX_FOOTER_YEARS = 5;

const footerYears = computed(() => {
  const all = props.years;
  if (all.length <= MAX_FOOTER_YEARS) return all;
  const idx = all.findIndex((y) => y.year === props.year);
  const center = idx >= 0 ? idx : 0;
  const half = Math.floor(MAX_FOOTER_YEARS / 2);
  let start = Math.max(0, center - half);
  let end = start + MAX_FOOTER_YEARS;
  if (end > all.length) {
    end = all.length;
    start = Math.max(0, end - MAX_FOOTER_YEARS);
  }
  return all.slice(start, end);
});

const hasOlderFooterYears = computed(() => {
  if (props.years.length <= MAX_FOOTER_YEARS) return false;
  const last = footerYears.value[footerYears.value.length - 1];
  const allLast = props.years[props.years.length - 1];
  return last && allLast && last.year > allLast.year;
});

const hasNewerFooterYears = computed(() => {
  if (props.years.length <= MAX_FOOTER_YEARS) return false;
  const first = footerYears.value[0];
  const allFirst = props.years[0];
  return first && allFirst && first.year < allFirst.year;
});

const MAX_PAGES = 50;

async function fetchAllRepos() {
  state.loading = true;
  state.repos = [];
  try {
    let allRepos: Repo[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < MAX_PAGES) {
      pages++;
      const { data, error } = await actions.fetchRepos({
        ...actionInput(),
        cursor,
      });
      if (error) break;
      allRepos = allRepos.concat(data.repos);
      cursor = data.nextCursor;
      hasMore = data.hasMore;
      state.total = data.total;
    }
    state.repos = allRepos;
  } finally {
    state.loading = false;
  }
}

async function fetchLanguages() {
  try {
    const { owner, search, year } = actionInput();
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

const debouncedRefresh = debounce(() => {
  fetchAllRepos();
  fetchLanguages();
}, 300);

watch(
  () => ({ ...state.filters }),
  (newVal, oldVal) => {
    const searchChanged = oldVal && newVal.search !== oldVal.search;
    if (searchChanged) {
      debouncedRefresh();
    } else {
      fetchAllRepos();
      fetchLanguages();
    }
  },
  { deep: true }
);

function updateFilters(partial: Record<string, unknown>) {
  Object.assign(state.filters, partial);
}

function selectLanguage(language: string | null) {
  state.filters.language = language;
}

onMounted(() => {
  fetchLanguages();
});
</script>

<template>
  <div class="space-y-4">
    <nav
      class="flex items-center justify-between text-sm"
      aria-label="Year navigation"
    >
      <a
        v-if="prevYear"
        :href="`/activity/code/${prevYear}`"
        class="text-accent hover:underline"
      >
        &larr; {{ prevYear }}
      </a>
      <span v-else />
      <a
        href="/activity/code"
        class="text-foreground/60 hover:text-accent transition-colors"
      >
        View in timeline
      </a>
      <a
        v-if="nextYear"
        :href="`/activity/code/${nextYear}`"
        class="text-accent hover:underline"
      >
        {{ nextYear }} &rarr;
      </a>
      <span v-else />
    </nav>

    <div
      class="sticky top-0 z-10 bg-background space-y-3 pt-3 -mt-3 pb-3 after:content-[''] after:absolute after:left-0 after:right-0 after:top-full after:h-6 after:bg-gradient-to-b after:from-background after:to-transparent after:pointer-events-none"
    >
      <FilterControls
        :filters="state.filters"
        :total="state.total"
        :repo-count="state.repos.length"
        year-page
        @update:filters="updateFilters"
      />
      <LanguageBar
        :languages="state.languages"
        :selected-language="state.filters.language"
        @select="selectLanguage"
      />
    </div>

    <div class="space-y-3">
      <RepoCard
        v-for="repo in state.repos"
        :key="`${repo.owner}/${repo.name}`"
        :repo="repo"
        :username="username"
      />
    </div>

    <LoadingPulse v-if="state.loading" />

    <p
      v-if="!state.loading && state.repos.length === 0"
      class="text-center text-muted py-8"
    >
      No activity data for {{ year }}.
    </p>

    <nav
      class="flex items-center justify-between text-sm pt-4 border-t border-border"
      aria-label="Year navigation"
    >
      <a
        v-if="prevYear"
        :href="`/activity/code/${prevYear}`"
        class="text-accent hover:underline flex-shrink-0"
      >
        &larr; {{ prevYear }}
      </a>
      <span v-else class="w-16" />
      <div class="flex items-center gap-2">
        <span v-if="hasNewerFooterYears" class="text-foreground/20">&hellip;</span>
        <a
          v-for="y in footerYears"
          :key="y.year"
          :href="`/activity/code/${y.year}`"
          :class="[
            'px-2 py-1 rounded transition-colors',
            y.year === year
              ? 'bg-accent text-background font-medium'
              : 'text-foreground/60 hover:text-accent',
          ]"
          :aria-current="y.year === year ? 'page' : undefined"
        >
          {{ y.year }}
          <span class="text-xs opacity-60">({{ y.count }})</span>
        </a>
        <span v-if="hasOlderFooterYears" class="text-foreground/20">&hellip;</span>
      </div>
      <a
        v-if="nextYear"
        :href="`/activity/code/${nextYear}`"
        class="text-accent hover:underline flex-shrink-0"
      >
        {{ nextYear }} &rarr;
      </a>
      <span v-else class="w-16" />
    </nav>
  </div>
</template>
