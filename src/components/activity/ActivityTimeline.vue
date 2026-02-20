<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  useActivityApi,
  type Repo,
  type YearCount,
} from "./composables/useActivityApi";
import FilterControls from "./FilterControls.vue";
import LanguageBar from "./LanguageBar.vue";
import RepoCard from "./RepoCard.vue";
import YearDivider from "./YearDivider.vue";
import TimelineRail from "./TimelineRail.vue";
import LoadingPulse from "./LoadingPulse.vue";

const props = defineProps<{
  initialRepos: Repo[];
  initialTotal: number;
  initialHasMore: boolean;
  initialCursor: string | null;
  username: string;
}>();

const { state, fetchRepos, fetchLanguages, fetchYears, prefetchNext } =
  useActivityApi(
    props.initialRepos,
    props.initialTotal,
    props.initialHasMore,
    props.initialCursor,
  );

const rootRef = ref<HTMLDivElement | null>(null);
const headerRef = ref<HTMLDivElement | null>(null);
const sentinelRef = ref<HTMLDivElement | null>(null);
let observer: IntersectionObserver | null = null;

const calendarYear = new Date().getFullYear();

const reposWithDividers = computed(() => {
  const items: Array<
    | { type: "divider"; year: number; key: string }
    | { type: "repo"; repo: Repo; key: string }
  > = [];
  const showDividers = state.filters.sort === "recent";
  let lastYear: number | null = null;

  for (const repo of state.repos) {
    const year = new Date(repo.lastActivity).getFullYear();
    if (showDividers && year !== lastYear) {
      if (year !== calendarYear) {
        items.push({ type: "divider", year, key: `year-${year}` });
      }
      lastYear = year;
    }
    items.push({ type: "repo", repo, key: `${repo.owner}/${repo.name}` });
  }
  return items;
});

const loadedYears = computed(() => {
  const years = new Set<number>();
  for (const repo of state.repos) {
    years.add(new Date(repo.lastActivity).getFullYear());
  }
  return years;
});

function updateFilters(partial: Record<string, unknown>) {
  Object.assign(state.filters, partial);
}

function selectLanguage(language: string | null) {
  state.filters.language = language;
}

function navigateToYear(year: number) {
  if (year === calendarYear) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.querySelector(`[data-year="${year}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

onMounted(() => {
  state.currentYear = calendarYear;

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !state.loading && state.hasMore) {
        fetchRepos();
      }
    },
    { rootMargin: "200px" },
  );

  if (sentinelRef.value) {
    observer.observe(sentinelRef.value);
  }

  prefetchNext();
  fetchLanguages();
  fetchYears();

  const headerHeight = headerRef.value?.offsetHeight ?? 0;
  rootRef.value?.style.setProperty("--header-height", `${headerHeight}px`);

  const yearObserver = new IntersectionObserver(
    (entries) => {
      let maxYear = -Infinity;
      for (const entry of entries) {
        const year = Number((entry.target as HTMLElement).dataset.year);
        if (!year) continue;

        let candidate: number;
        if (entry.isIntersecting) {
          candidate = year;
        } else if (entry.boundingClientRect.top > 0) {
          candidate = year + 1;
        } else {
          continue;
        }

        if (candidate > maxYear) maxYear = candidate;
      }
      if (maxYear > -Infinity) state.currentYear = maxYear;
    },
    { rootMargin: `-${headerHeight}px 0px -50% 0px` },
  );

  const root = rootRef.value;
  const observe = () => {
    root
      ?.querySelectorAll("[data-year]")
      .forEach((el) => yearObserver.observe(el));
  };

  observe();
  const mo = new MutationObserver(observe);
  if (root) {
    mo.observe(root, { childList: true, subtree: true });
  }

  onUnmounted(() => {
    observer?.disconnect();
    yearObserver.disconnect();
    mo.disconnect();
  });
});
</script>

<template>
  <div ref="rootRef" class="relative space-y-4">
    <div
      ref="headerRef"
      class="sticky top-0 z-10 bg-background space-y-3 pt-3 -mt-3 pb-3 after:content-[''] after:absolute after:left-0 after:right-0 after:top-full after:h-6 after:bg-gradient-to-b after:from-background after:to-transparent after:pointer-events-none"
    >
      <FilterControls
        :filters="state.filters"
        :total="state.total"
        :repo-count="state.repos.length"
        @update:filters="updateFilters"
      />
      <LanguageBar
        :languages="state.languages"
        :selected-language="state.filters.language"
        @select="selectLanguage"
      />
    </div>

    <div class="space-y-3">
      <template v-for="item in reposWithDividers" :key="item.key">
        <YearDivider v-if="item.type === 'divider'" :year="item.year" />
        <RepoCard v-else :repo="item.repo" :username="username" />
      </template>
    </div>

    <LoadingPulse v-if="state.loading" />

    <div ref="sentinelRef" class="h-1" />

    <p
      v-if="!state.loading && state.repos.length === 0"
      class="text-center text-muted py-8"
    >
      No activity data available.
    </p>

    <TimelineRail
      :years="state.years"
      :current-year="state.currentYear"
      :loaded-years="loadedYears"
      @navigate="navigateToYear"
    />
  </div>
</template>
