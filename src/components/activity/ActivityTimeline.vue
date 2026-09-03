<script setup lang="ts">
import {
  defaultWindow,
  useElementSize,
  useIntersectionObserver,
  useInfiniteScroll,
  useMutationObserver,
} from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import { TooltipProvider } from "reka-ui";
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

// `defaultWindow` is `undefined` on the server, where the bare global would
// throw during the island's SSR render. Astro renders this component before it
// hydrates, so setup runs in both places.
useInfiniteScroll(defaultWindow, () => fetchRepos(), {
  distance: 200,
  canLoadMore: () => state.hasMore,
});

// The header carries its own padding, and the sticky dividers below it are
// offset by the whole box. `useElementSize` measures the content box by
// default, which would seat them 24px too high.
const { height: headerHeight } = useElementSize(headerRef, undefined, {
  box: "border-box",
});

watch(
  headerHeight,
  (height) => {
    rootRef.value?.style.setProperty("--header-height", `${height}px`);
  },
  { immediate: true },
);

// [data-year] dividers are added as more repos load, so this re-collects them
// whenever the root's subtree changes.
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

// Intersection is tracked across callbacks rather than read out of one. A new
// target array or a new root margin makes `useIntersectionObserver` rebuild the
// underlying observer, and a fresh observer reports every target rather than
// only the ones that changed, so a reduction over one callback's entries sees a
// different set depending on whether a rebuild just happened.
const intersectingYears = new Set<HTMLElement>();

watch(yearElements, (current) => {
  const live = new Set(current);
  for (const element of intersectingYears) {
    if (!live.has(element)) intersectingYears.delete(element);
  }
});

function selectCurrentYear() {
  // Dividers are sticky within one containing block, so each one the reader has
  // passed stays pinned in the band alongside the others. The section actually
  // on screen belongs to the last of them, which is the smallest year.
  let passed = Infinity;
  for (const element of intersectingYears) {
    const year = Number(element.dataset.year);
    if (year && year < passed) passed = year;
  }
  if (passed < Infinity) {
    state.currentYear = passed;
    return;
  }

  // Nothing has been passed yet, so the reader sits above every divider and the
  // closest one below names the year after it.
  let upcoming = -Infinity;
  for (const element of yearElements.value) {
    const year = Number(element.dataset.year);
    if (!year) continue;
    if (element.getBoundingClientRect().top > 0 && year + 1 > upcoming) {
      upcoming = year + 1;
    }
  }
  if (upcoming > -Infinity) state.currentYear = upcoming;
}

useIntersectionObserver(
  yearElements,
  (entries) => {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) continue;
      if (entry.isIntersecting) intersectingYears.add(entry.target);
      else intersectingYears.delete(entry.target);
    }
    selectCurrentYear();
  },
  { rootMargin: () => `-${headerHeight.value}px 0px -50% 0px` },
);
</script>

<template>
  <TooltipProvider>
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
  </TooltipProvider>
</template>
