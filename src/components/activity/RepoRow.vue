<script setup lang="ts">
import { computed } from "vue";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type { Repo } from "@/activity/types";
import { SITE } from "@/config";
import { languageLabel } from "./language";

/**
 * One repository as a line in a list: the name, and its language as a file
 * extension. The owner, what it is, and when it was last touched are left
 * to the title.
 */
const props = defineProps<{ repo: Repo }>();

const title = computed(() =>
  [
    `${props.repo.owner}/${props.repo.name}`,
    props.repo.description,
    `last active ${format(new TZDate(new Date(props.repo.lastActivity), SITE.timezone), "PPP")}`,
  ]
    .filter(Boolean)
    .join("\n"),
);
</script>

<template>
  <div class="flex items-baseline gap-x-3 py-1">
    <a
      :href="repo.url"
      target="_blank"
      rel="noopener noreferrer"
      :title="title"
      class="min-w-0 truncate hover:text-accent"
    >
      {{ repo.name }}
    </a>
    <span
      v-if="repo.primaryLanguage"
      :title="repo.primaryLanguage.name"
      class="ml-auto shrink-0 text-xs text-foreground/35"
    >
      {{ languageLabel(repo.primaryLanguage) }}
    </span>
  </div>
</template>
