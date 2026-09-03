<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import {
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  format,
} from "date-fns";
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from "reka-ui";
import type { Repo } from "@/activity/types";
import ActivityIcon from "./ActivityIcon.vue";

const props = defineProps<{
  repo: Repo;
  username: string;
}>();

const isMac = ref(true);
onMounted(() => {
  isMac.value = navigator.platform?.includes("Mac") ?? true;
});

const isExternal = computed(() => props.repo.owner !== props.username);

const isNew = computed(() => {
  if (!props.repo.createdAt) return false;
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return new Date(props.repo.createdAt).getTime() > threeMonthsAgo;
});

const createdTitle = computed(() => {
  if (!props.repo.createdAt) return "";
  return `Created ${format(new Date(props.repo.createdAt), "PPP")}`;
});

const lastActivityDate = computed(() => new Date(props.repo.lastActivity));

const relativeDate = computed(() => {
  const d = lastActivityDate.value;
  if (isToday(d)) return formatDistanceToNowStrict(d, { addSuffix: true });
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
});

const fullDate = computed(() => format(lastActivityDate.value, "PPPp"));

function formatStarCount(count: number): string {
  if (count < 1000) return count.toString();
  const thousands = Math.floor(count / 100) / 10;
  return `${thousands}k`;
}

function getGitHubSearchUrl(type: "pr" | "review" | "issue" | "merge"): string {
  const repo = props.repo;
  const baseUrl = "https://github.com/search";
  const repoQuery = `repo:${repo.owner}/${repo.name}`;
  const years = repo.years ?? [];
  const oldestYear = years.length
    ? Math.min(...years)
    : new Date().getFullYear();
  const timeFilter = `created:>${oldestYear}-01-01`;

  let query = "";
  let searchType = "";

  switch (type) {
    case "pr":
      query = `${repoQuery} is:pr is:merged author:${props.username} ${timeFilter}`;
      searchType = "pullrequests";
      break;
    case "review":
      query = `${repoQuery} is:pr reviewed-by:${props.username} ${timeFilter}`;
      searchType = "pullrequests";
      break;
    case "issue":
      query = `${repoQuery} is:issue involves:${props.username} updated:>${oldestYear}-01-01`;
      searchType = "issues";
      break;
    case "merge":
      query = `${repoQuery} is:pr is:merged -author:${props.username} -author:app/dependabot -author:app/renovate merged:>${oldestYear}-01-01`;
      searchType = "pullrequests";
      break;
  }

  return `${baseUrl}?q=${encodeURIComponent(query)}&type=${searchType}&s=created&o=desc`;
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "o") {
    e.preventDefault();
    window.open(props.repo.url, "_blank");
  }
}
</script>

<template>
  <TooltipProvider>
    <div
      class="group/card rounded-lg border border-border bg-background p-4 focus-within:ring-1 focus-within:ring-accent sm:p-6"
      tabindex="0"
      @keydown="handleKeydown"
    >
      <div
        class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-semibold">
              <a
                :href="repo.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-foreground transition-colors hover:text-accent focus:text-accent focus:underline focus:outline-none"
              >
                <template v-if="isExternal">
                  <span class="font-normal text-foreground/60"
                    >{{ repo.owner }}/</span
                  >{{ repo.name }}
                </template>
                <template v-else>{{ repo.name }}</template>
              </a>
            </h3>
            <span
              v-if="repo.primaryLanguage"
              class="inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-medium"
              :style="{
                backgroundColor: repo.primaryLanguage.color + '20',
                color: repo.primaryLanguage.color,
              }"
            >
              {{ repo.primaryLanguage.name }}
            </span>
            <TooltipRoot v-if="isNew">
              <TooltipTrigger as-child>
                <span
                  class="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/20 px-2 py-1 text-xs font-bold text-green-600"
                >
                  New!
                </span>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  :side-offset="4"
                  class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
                >
                  {{ createdTitle }}
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
          </div>
          <p class="mb-3 line-clamp-2 text-sm text-foreground">
            {{ repo.description }}
          </p>
          <div
            class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/70"
          >
            <TooltipRoot v-if="repo.activitySummary.prCount > 0">
              <TooltipTrigger as-child>
                <a
                  :href="getGitHubSearchUrl('pr')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 transition-colors hover:text-accent focus:text-accent focus:underline focus:outline-none"
                >
                  <ActivityIcon name="git-pull-request" class="flex-shrink-0" />
                  <span>{{ repo.activitySummary.prCount }}</span>
                </a>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  :side-offset="4"
                  class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
                >
                  Pull requests authored
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
            <TooltipRoot v-if="repo.activitySummary.reviewCount > 0">
              <TooltipTrigger as-child>
                <a
                  :href="getGitHubSearchUrl('review')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 transition-colors hover:text-accent focus:text-accent focus:underline focus:outline-none"
                >
                  <ActivityIcon name="file-check" class="flex-shrink-0" />
                  <span>{{ repo.activitySummary.reviewCount }}</span>
                </a>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  :side-offset="4"
                  class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
                >
                  Pull request reviews submitted
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
            <TooltipRoot v-if="repo.activitySummary.mergeCount > 0">
              <TooltipTrigger as-child>
                <a
                  :href="getGitHubSearchUrl('merge')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 transition-colors hover:text-accent focus:text-accent focus:underline focus:outline-none"
                >
                  <ActivityIcon name="git-merge" class="flex-shrink-0" />
                  <span>{{ repo.activitySummary.mergeCount }}</span>
                </a>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  :side-offset="4"
                  class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
                >
                  Pull requests merged
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
            <TooltipRoot v-if="repo.activitySummary.issueCount > 0">
              <TooltipTrigger as-child>
                <a
                  :href="getGitHubSearchUrl('issue')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 transition-colors hover:text-accent focus:text-accent focus:underline focus:outline-none"
                >
                  <ActivityIcon name="circle-dot" class="flex-shrink-0" />
                  <span>{{ repo.activitySummary.issueCount }}</span>
                </a>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  :side-offset="4"
                  class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
                >
                  Issues opened or commented
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
            <TooltipRoot v-if="repo.stargazerCount > 0">
              <TooltipTrigger as-child>
                <a
                  :href="`${repo.url}/stargazers`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 transition-colors hover:text-accent focus:text-accent focus:underline focus:outline-none"
                >
                  <ActivityIcon name="star" class="flex-shrink-0" />
                  <span>{{ formatStarCount(repo.stargazerCount) }}</span>
                </a>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  :side-offset="4"
                  class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
                >
                  GitHub stars
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
          </div>
        </div>
        <div class="flex-shrink-0 text-sm text-foreground/60 sm:text-right">
          <time :datetime="lastActivityDate.toISOString()" :title="fullDate">
            {{ relativeDate }}
          </time>
          <div
            class="mt-1 hidden items-center justify-end gap-1 text-xs text-foreground/30 group-focus-within/card:flex"
          >
            <kbd
              class="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px] leading-none"
            >
              {{ isMac ? "\u2318O" : "Ctrl+O" }}
            </kbd>
            open
          </div>
        </div>
      </div>
    </div>
  </TooltipProvider>
</template>
