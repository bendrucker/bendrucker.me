<script setup lang="ts">
import {
  useElementSize,
  useIntersectionObserver,
  useInfiniteScroll,
  useMutationObserver,
} from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import { useActivityApi } from "./composables/useActivityApi";
import type { Repo } from "@/activity/types";
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
  prefetchNext();
  fetchLanguages();
  fetchYears();
});

useInfiniteScroll(window, () => fetchRepos(), {
  distance: 200,
  canLoadMore: () => state.hasMore,
});

const { height: headerHeight } = useElementSize(headerRef);

watch(
  headerHeight,
  (height) => {
    rootRef.value?.style.setProperty("--header-height", `${height}px`);
  },
  { immediate: true },
);

// [data-year] dividers are added as more repos load, so this re-collects them
// whenever the root's subtree changes rather than only once at mount.
const yearElements = ref<HTMLElement[]>([]);
function collectYearElements() {
  yearElements.value = rootRef.value
    ? [...rootRef.value.querySelectorAll<HTMLElement>("[data-year]")]
    : [];
}
watch(rootRef, collectYearElements, { immediate: true, flush: "post" });
useMutationObserver(rootRef, collectYearElements, {
  childList: true,
  subtree: true,
});

useIntersectionObserver(
  yearElements,
  (entries) => {
    let maxYear = -Infinity;
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) continue;
      const year = Number(entry.target.dataset.year);
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
  { rootMargin: () => `-${headerHeight.value}px 0px -50% 0px` },
);
</script>

<template>
  <div ref="rootRef" class="relative space-y-4">
    <div
      ref="headerRef"
      class="sticky top-0 z-10 -mt-3 space-y-3 bg-background pt-3 pb-3 after:pointer-events-none after:absolute after:top-full after:right-0 after:left-0 after:h-6 after:bg-gradient-to-b after:from-background after:to-transparent after:content-['']"
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

    <p
      v-if="!state.loading && state.repos.length === 0"
      class="py-8 text-center text-muted"
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
