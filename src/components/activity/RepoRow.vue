<script setup lang="ts">
import { computed } from "vue";
import { format } from "date-fns";
import type { Repo } from "@/activity/types";
import { formatRecency } from "@/components/recency";

/**
 * One repository as a line in a list: the name, what it is, and how long
 * ago. In a narrow list the description takes the line beneath and an
 * external repository's owner is left off, since the name is what the
 * reader recognizes and there is no room for both. The list is the
 * container, so a column on a wide page reads the same as a phone.
 */
const props = defineProps<{ repo: Repo; username: string; now?: Date }>();

const isExternal = computed(() => props.repo.owner !== props.username);
const last = computed(() => new Date(props.repo.lastActivity));
const when = computed(() => formatRecency(last.value, props.now));
const full = computed(() => format(last.value, "PPPp"));
</script>

<template>
  <div
    class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-muted py-2.5 text-sm"
  >
    <a
      :href="repo.url"
      target="_blank"
      rel="noopener noreferrer"
      class="max-w-full min-w-0 flex-1 truncate hover:text-accent @md:flex-none"
    >
      <span v-if="isExternal" class="hidden text-foreground/50 @md:inline"
        >{{ repo.owner }}/</span
      >{{ repo.name }}
    </a>
    <time
      :datetime="repo.lastActivity"
      :title="full"
      class="order-2 w-16 shrink-0 text-right text-xs text-foreground/50 @md:order-3"
    >
      {{ when }}
    </time>
    <span
      v-if="repo.description"
      class="order-3 min-w-0 basis-full truncate text-xs text-foreground/55 @md:order-2 @md:flex-1 @md:basis-0 @md:text-sm"
    >
      {{ repo.description }}
    </span>
  </div>
</template>
