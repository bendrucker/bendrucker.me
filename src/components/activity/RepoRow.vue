<script setup lang="ts">
import { computed } from "vue";
import { format } from "date-fns";
import type { Repo } from "@/activity/types";
import RowStat from "@/components/RowStat.vue";
import { formatRecency } from "@/components/recency";
import { formatStarCount } from "./format";

/**
 * One repository as a few lines in a list: the name and how long ago, what
 * it is, then its language and the activity counts behind icons. Above the
 * small breakpoint the description joins the name on its line.
 */
const props = defineProps<{ repo: Repo; username: string; now?: Date }>();

const isExternal = computed(() => props.repo.owner !== props.username);
const last = computed(() => new Date(props.repo.lastActivity));
const when = computed(() => formatRecency(last.value, props.now));
const full = computed(() => format(last.value, "PPPp"));

const counts = computed(() => {
  const summary = props.repo.activitySummary;
  return [
    {
      key: "pr",
      icon: "git-pull-request",
      label: "Pull requests",
      count: summary.prCount,
    },
    {
      key: "review",
      icon: "file-check",
      label: "Reviews",
      count: summary.reviewCount,
    },
    {
      key: "merge",
      icon: "git-merge",
      label: "Merged",
      count: summary.mergeCount,
    },
    {
      key: "issue",
      icon: "circle-dot",
      label: "Issues",
      count: summary.issueCount,
    },
  ] as const;
});
</script>

<template>
  <div
    class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-muted py-2.5 text-sm"
  >
    <a
      :href="repo.url"
      target="_blank"
      rel="noopener noreferrer"
      class="max-w-full min-w-0 flex-1 truncate hover:text-accent sm:flex-none"
    >
      <span v-if="isExternal" class="text-foreground/50">{{ repo.owner }}/</span
      >{{ repo.name }}
    </a>
    <time
      :datetime="repo.lastActivity"
      :title="full"
      class="order-2 shrink-0 text-xs text-foreground/50 sm:order-3"
    >
      {{ when }}
    </time>
    <span
      v-if="repo.description"
      class="order-3 min-w-0 basis-full truncate text-xs text-foreground/60 sm:order-2 sm:flex-1 sm:basis-0 sm:text-sm"
    >
      {{ repo.description }}
    </span>
    <span
      class="order-4 flex basis-full flex-wrap gap-x-3.5 gap-y-1 text-xs text-foreground/70 tabular-nums"
    >
      <span
        v-if="repo.primaryLanguage"
        class="flex items-center gap-1.5 whitespace-nowrap"
      >
        <span
          class="inline-block size-2 rounded-full"
          :style="{ backgroundColor: repo.primaryLanguage.color }"
          aria-hidden="true"
        ></span>
        {{ repo.primaryLanguage.name }}
      </span>
      <template v-for="item in counts" :key="item.key">
        <RowStat v-if="item.count > 0" :icon="item.icon" :label="item.label">
          {{ item.count }}
        </RowStat>
      </template>
      <RowStat v-if="repo.stargazerCount > 0" icon="star" label="Stars">
        {{ formatStarCount(repo.stargazerCount) }}
      </RowStat>
    </span>
  </div>
</template>
