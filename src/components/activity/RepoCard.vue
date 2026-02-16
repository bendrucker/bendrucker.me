<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import {
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  format,
} from "date-fns";
import type { Repo } from "./composables/useActivityApi";

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
  <div
    class="group/card border border-border rounded-lg p-4 sm:p-6 bg-background focus-within:ring-1 focus-within:ring-accent"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div
      class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3"
    >
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <h3 class="text-lg font-semibold">
            <a
              :href="repo.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-foreground hover:text-accent focus:text-accent focus:outline-none focus:underline transition-colors"
            >
              <template v-if="isExternal">
                <span class="text-foreground/60 font-normal"
                  >{{ repo.owner }}/</span
                >{{ repo.name }}
              </template>
              <template v-else>{{ repo.name }}</template>
            </a>
          </h3>
          <span
            v-if="repo.primaryLanguage"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-border"
            :style="{
              backgroundColor: repo.primaryLanguage.color + '20',
              color: repo.primaryLanguage.color,
            }"
          >
            {{ repo.primaryLanguage.name }}
          </span>
          <span
            v-if="isNew"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border border-green-500/30 bg-green-500/20 text-green-600"
            :title="createdTitle"
          >
            New!
          </span>
        </div>
        <p class="text-foreground text-sm mb-3 line-clamp-2">{{ repo.description }}</p>
        <div
          class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/70"
        >
          <a
            v-if="repo.activitySummary.prCount > 0"
            :href="getGitHubSearchUrl('pr')"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 hover:text-accent focus:text-accent focus:outline-none focus:underline transition-colors"
            title="Pull requests authored"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M6 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M6 8l0 8" />
              <path d="M11 6h5a2 2 0 0 1 2 2v8" />
              <path d="M14 9l-3 -3l3 -3" />
            </svg>
            <span>{{ repo.activitySummary.prCount }}</span>
          </a>
          <a
            v-if="repo.activitySummary.reviewCount > 0"
            :href="getGitHubSearchUrl('review')"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 hover:text-accent focus:text-accent focus:outline-none focus:underline transition-colors"
            title="Pull request reviews submitted"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M9.615 20h-2.615a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8"
              />
              <path d="M14 19l2 2l4 -4" />
              <path d="M9 8h4" />
              <path d="M9 12h2" />
            </svg>
            <span>{{ repo.activitySummary.reviewCount }}</span>
          </a>
          <a
            v-if="repo.activitySummary.mergeCount > 0"
            :href="getGitHubSearchUrl('merge')"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 hover:text-accent focus:text-accent focus:outline-none focus:underline transition-colors"
            title="Pull requests merged"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M7 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M7 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M17 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M7 8l0 8" />
              <path d="M7 8a4 4 0 0 0 4 4h4" />
            </svg>
            <span>{{ repo.activitySummary.mergeCount }}</span>
          </a>
          <a
            v-if="repo.activitySummary.issueCount > 0"
            :href="getGitHubSearchUrl('issue')"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 hover:text-accent focus:text-accent focus:outline-none focus:underline transition-colors"
            title="Issues opened or commented"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
              <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
            </svg>
            <span>{{ repo.activitySummary.issueCount }}</span>
          </a>
          <a
            v-if="repo.stargazerCount > 0"
            :href="`${repo.url}/stargazers`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 hover:text-accent focus:text-accent focus:outline-none focus:underline transition-colors"
            title="GitHub stars"
          >
            <svg
              class="w-4 h-4 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"
              />
            </svg>
            <span>{{ formatStarCount(repo.stargazerCount) }}</span>
          </a>
        </div>
      </div>
      <div class="text-sm text-foreground/60 flex-shrink-0 sm:text-right">
        <time
          :datetime="lastActivityDate.toISOString()"
          :title="fullDate"
        >
          {{ relativeDate }}
        </time>
        <div
          class="hidden group-focus-within/card:flex items-center gap-1 mt-1 text-foreground/30 text-xs justify-end"
        >
          <kbd
            class="px-1 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-mono leading-none"
          >
            {{ isMac ? "\u2318O" : "Ctrl+O" }}
          </kbd>
          open
        </div>
      </div>
    </div>
  </div>
</template>
