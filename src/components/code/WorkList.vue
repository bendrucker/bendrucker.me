<script setup lang="ts">
// The pull requests and issues on a repository's or a project's page, each
// opening on GitHub, newest first. Past the limit, "More" runs GitHub's own
// search for the rest.
import { WORK_STATE_NAMES, type WorkItem, type WorkState } from "@/code/page";

defineProps<{
  items: readonly WorkItem[];
  /** GitHub's search for everything, shown once the list stops short. */
  moreHref?: string;
}>();

// Written out in full: Tailwind extracts classes from source text. Open and
// done take GitHub's green and purple, the colors a reader already knows
// them by. Work that went nowhere stays quiet rather than red.
const STATE_ICONS: Record<WorkState, string> = {
  MERGED: "icon-[lucide--git-merge] text-[#8250df] dark:text-[#a371f7]",
  OPEN: "icon-[lucide--git-pull-request] text-[#1a7f37] dark:text-[#3fb950]",
  DRAFT: "icon-[lucide--git-pull-request-draft] text-dim",
  CLOSED: "icon-[lucide--git-pull-request-closed] text-dim",
  ISSUE_OPEN: "icon-[lucide--circle-dot] text-[#1a7f37] dark:text-[#3fb950]",
  ISSUE_DONE: "icon-[lucide--circle-check] text-[#8250df] dark:text-[#a371f7]",
  ISSUE_NOT_PLANNED: "icon-[lucide--circle-slash] text-dim",
};
</script>

<template>
  <section
    v-if="items.length > 0"
    aria-label="Pull requests and issues"
    class="flex flex-col"
  >
    <ul class="flex flex-col">
      <li v-for="item in items" :key="item.id" class="border-t border-line">
        <a
          :href="item.url"
          target="_blank"
          rel="noopener"
          class="group/work -mx-1.5 flex items-start gap-2.5 rounded-md px-1.5 py-2.5 text-foreground no-underline transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat"
        >
          <span
            role="img"
            :aria-label="WORK_STATE_NAMES[item.state]"
            class="mt-[3px] size-3.5 flex-none"
            :class="STATE_ICONS[item.state]"
          />
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              v-if="item.repo"
              class="truncate font-mono text-[11px] leading-[1.3] text-dim"
            >
              {{ item.repo }}
            </span>
            <span class="text-sm leading-[1.4] wrap-anywhere">
              {{ item.title }}
            </span>
          </span>
          <span
            role="img"
            aria-label="Opens GitHub"
            class="mt-1 size-[13px] flex-none text-dim opacity-0 transition-[opacity,translate] duration-[200ms,350ms] ease-spring icon-[lucide--arrow-up-right] group-hover/work:translate-x-0.5 group-hover/work:-translate-y-0.5 group-hover/work:opacity-100 group-focus-visible/work:opacity-100"
          />
        </a>
      </li>
    </ul>
    <a
      v-if="moreHref"
      :href="moreHref"
      target="_blank"
      rel="noopener"
      class="mt-1 inline-flex min-h-9 items-center gap-1 self-start rounded-md px-1.5 font-mono text-xs text-cat no-underline hover:bg-hover focus-visible:outline-2 focus-visible:outline-cat"
    >
      More
      <span
        role="img"
        aria-label="on GitHub"
        class="size-3 icon-[lucide--arrow-up-right]"
      />
    </a>
  </section>
</template>
