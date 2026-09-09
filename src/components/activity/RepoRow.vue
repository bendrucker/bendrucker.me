<script setup lang="ts">
import { computed } from "vue";
import { format } from "date-fns";
import type { Repo } from "@/activity/types";

/**
 * One repository as a line in a list: when it was last touched, its name,
 * what it is, and its language. The date takes the form a ride row uses,
 * so the two kinds of row line up on a page that shows both.
 */
const props = defineProps<{ repo: Repo; username: string }>();

const isExternal = computed(() => props.repo.owner !== props.username);

const last = computed(() => new Date(props.repo.lastActivity));

const when = computed(() => format(last.value, "EEE M/d").toLowerCase());

const full = computed(() => format(last.value, "PPPp"));
</script>

<template>
  <div
    class="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-muted py-2.5 text-sm"
  >
    <time
      :datetime="repo.lastActivity"
      :title="full"
      class="text-foreground/50 tabular-nums"
    >
      {{ when }}
    </time>
    <span class="flex min-w-0 items-baseline gap-3">
      <a
        :href="repo.url"
        target="_blank"
        rel="noopener noreferrer"
        class="max-w-full shrink-0 truncate hover:text-accent"
      >
        <span v-if="isExternal" class="text-foreground/50"
          >{{ repo.owner }}/</span
        >{{ repo.name }}
      </a>
      <span
        v-if="repo.description"
        class="hidden min-w-0 flex-1 truncate text-foreground/50 sm:inline"
      >
        {{ repo.description }}
      </span>
    </span>
    <span
      v-if="repo.primaryLanguage"
      class="flex items-center gap-1.5 text-foreground/70"
    >
      <span
        class="inline-block size-2 rounded-full"
        :style="{ backgroundColor: repo.primaryLanguage.color }"
        aria-hidden="true"
      ></span>
      {{ repo.primaryLanguage.name }}
    </span>
  </div>
</template>
