<script setup lang="ts">
import { computed } from "vue";
import MarkedText from "./MarkedText.vue";
import { vArtFallback } from "./artFallback";
import { PART_ICONS, type PartIcon } from "./icons";

/**
 * What leads a row: a repository's language diamond, a project's diamond in a
 * ring, a reading row's type, a poster, or a sleeve. Rides and posts lead with
 * nothing.
 */
export type RowLead = "none" | "dot" | "ring" | "kind" | "poster" | "sleeve";

const props = withDefaults(
  defineProps<{
    href: string;
    title: string;
    /** The owner, above the title, when it isn't you. */
    org?: string;
    /** A description, an author, or a season. */
    text?: string;
    /** Your own note, set off by a rule in the category color. */
    note?: string;
    lead?: RowLead;
    /** The diamond's color: a repository's language. */
    dot?: string;
    /** The icon a `kind` lead shows. */
    kind?: PartIcon;
    /** What the lead is, for a screen reader: "Book", "Show", "Project". */
    leadLabel?: string;
    /** A poster or sleeve image. */
    art?: string;
    /** A podcast's sleeve has rounder corners than an album's. */
    podcast?: boolean;
    /** A distance, right-aligned in mono. */
    figure?: string;
    /** Marks a ride that climbs 18 m or more per km. */
    hilly?: boolean;
    /** How much of each episode tick is watched, 0 to 1. */
    ticks?: readonly number[];
    tickLabel?: string;
    /** The service a row that leaves the site opens. Unset, the row opens a page here. */
    via?: string;
    /** The search to mark in every field the row renders. */
    query?: string;
    /** The home card's row: a single line, drawn without the gutter or chevron. */
    compact?: boolean;
    /** Names the row for a view transition into its page. */
    transitionName?: string;
    /**
     * A row on an item page's plain ground, which a lightened background
     * would vanish into, takes the category's tint instead.
     */
    tinted?: boolean;
  }>(),
  {
    lead: "none",
    query: "",
    compact: false,
    tinted: false,
  },
);

const leaves = computed(() => props.via !== undefined);

const linkClass = computed(() =>
  props.compact
    ? "-mx-1.5 w-[calc(100%+12px)] gap-2.5 rounded-md px-1.5 py-1 hover:bg-hover"
    : "min-h-11 w-full flex-1 gap-2.5 rounded-xl py-[9px] pr-2.5 pl-3 transition-[background-color,translate,scale] duration-[250ms,400ms,400ms] ease-spring hover:translate-x-[3px] active:scale-[.97] motion-reduce:transition-none motion-reduce:hover:translate-x-0",
);

const groundClass = computed(() => {
  if (props.compact) return "";
  return props.tinted
    ? "tint-6 hover:tint-10"
    : "bg-background/60 hover:bg-background";
});

function tickBackground(fraction: number): string {
  const on = "var(--cat)";
  const off = "color-mix(in srgb, var(--cat) 20%, transparent)";
  if (fraction >= 1) return on;
  if (fraction <= 0) return off;
  return `linear-gradient(90deg, ${on} ${Math.round(fraction * 100)}%, ${off} 0)`;
}
</script>

<template>
  <div class="flex min-w-0 items-start gap-2">
    <slot name="gutter" />
    <a
      :href="href"
      class="group/row flex min-w-0 items-center text-left text-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid"
      :class="[linkClass, groundClass]"
      :style="
        transitionName ? { viewTransitionName: transitionName } : undefined
      "
      v-bind="leaves ? { target: '_blank', rel: 'noopener' } : {}"
    >
      <span
        v-if="lead === 'dot'"
        class="inline-flex w-4 flex-none items-center justify-center self-start"
        :class="compact ? 'mt-1' : 'mt-[5px]'"
      >
        <span
          class="size-[9px] rotate-45 rounded-[2px] transition-transform duration-600 ease-spring group-hover/row:rotate-[225deg] motion-reduce:transition-none"
          :style="{ background: dot }"
        />
      </span>
      <span
        v-else-if="lead === 'ring'"
        role="img"
        :aria-label="leadLabel ?? 'Project'"
        class="inline-flex w-4 flex-none items-center justify-center self-start"
        :class="compact ? 'mt-1' : 'mt-[5px]'"
      >
        <span
          class="inline-flex size-[11px] rotate-45 items-center justify-center rounded-[2.5px] border-[1.5px] border-current/55 transition-transform duration-600 ease-spring group-hover/row:rotate-[225deg] motion-reduce:transition-none"
          :style="{ color: dot }"
        >
          <i class="size-[5px] rounded-[1px] bg-current" />
        </span>
      </span>
      <span
        v-else-if="lead === 'kind' && kind"
        class="inline-flex w-4 flex-none items-center justify-center self-start"
        :class="compact ? 'mt-0.5' : 'mt-[3px]'"
      >
        <span
          role="img"
          :aria-label="leadLabel"
          class="size-3.5 text-dim"
          :class="PART_ICONS[kind]"
        />
      </span>
      <!-- Art sits on a tile, which is all that shows when it is missing or
           fails to load. The kind is spoken rather than put in the alt, so a
           broken image has no text to spill out of a 30px slot. -->
      <span
        v-else-if="lead === 'poster' || lead === 'sleeve'"
        class="flex-none overflow-hidden bg-tile shadow-[0_4px_10px_-6px_var(--shadow)] transition-transform duration-400 ease-spring group-hover/row:-rotate-2 motion-reduce:transition-none"
        :class="
          lead === 'poster'
            ? 'aspect-[2/3] w-[30px] rounded-[3px]'
            : ['size-[38px]', podcast ? 'rounded-lg' : 'rounded-[3px]']
        "
      >
        <img
          v-if="art"
          v-art-fallback
          :src="art"
          alt=""
          :width="lead === 'poster' ? 30 : 38"
          :height="lead === 'poster' ? 45 : 38"
          loading="lazy"
          class="size-full object-cover"
        />
      </span>
      <span
        v-if="(lead === 'poster' || lead === 'sleeve') && leadLabel"
        class="sr-only"
        >{{ leadLabel }}</span
      >

      <span v-if="compact" class="flex min-w-0 flex-1 flex-col gap-px">
        <span
          v-if="org"
          class="line-clamp-1 text-[11px] leading-[1.3] text-dim"
        >
          <MarkedText :text="org" :query="query" />
        </span>
        <span class="flex min-w-0 items-baseline gap-2">
          <span class="line-clamp-1 max-w-full flex-none text-sm">
            <MarkedText :text="title" :query="query" />
          </span>
          <span v-if="text" class="line-clamp-1 min-w-0 text-xs text-dim">
            <MarkedText :text="text" :query="query" />
          </span>
        </span>
        <span
          v-if="note"
          class="mt-0.5 line-clamp-1 border-l-2 border-cat/40 pl-2 text-xs leading-normal italic"
        >
          <MarkedText :text="note" :query="query" />
        </span>
      </span>
      <span v-else class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          v-if="org"
          class="line-clamp-1 text-[11px] leading-[1.3] text-dim"
        >
          <MarkedText :text="org" :query="query" />
        </span>
        <span class="line-clamp-2 text-[15px] leading-[1.35] wrap-anywhere">
          <MarkedText :text="title" :query="query" />
        </span>
        <span
          v-if="text"
          class="line-clamp-2 text-[13px] leading-[1.45] text-dim"
        >
          <MarkedText :text="text" :query="query" />
        </span>
        <span
          v-if="note"
          class="mt-[3px] line-clamp-2 border-l-2 border-cat/40 pl-2 text-[13px] leading-normal italic"
        >
          <MarkedText :text="note" :query="query" />
        </span>
        <span
          v-if="ticks?.length"
          role="img"
          :aria-label="tickLabel"
          class="mt-1 flex w-full max-w-[140px] gap-0.5"
        >
          <span
            v-for="(fraction, i) in ticks"
            :key="i"
            class="h-[3px] flex-1 rounded-[1px]"
            :style="{ background: tickBackground(fraction) }"
          />
        </span>
      </span>

      <span
        v-if="figure"
        class="inline-flex flex-none items-center gap-1.5 font-mono text-xs whitespace-nowrap text-dim tabular-nums"
      >
        <span class="inline-flex size-[13px]">
          <span
            v-if="hilly"
            role="img"
            aria-label="Hilly"
            class="size-[13px] icon-[lucide--mountain] group-hover/row:animate-nudge motion-reduce:group-hover/row:animate-none"
          />
        </span>
        <span class="min-w-[6ch] text-right">{{ figure }}</span>
      </span>

      <span
        v-if="leaves"
        role="img"
        :aria-label="`Opens ${via}`"
        class="flex-none self-center text-dim transition-[opacity,translate] duration-[200ms,350ms] ease-spring icon-[lucide--arrow-up-right] group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5 group-hover/row:opacity-100"
        :class="compact ? 'size-3 opacity-50' : 'size-[13px] opacity-60'"
      />
      <span
        v-else-if="!compact"
        aria-hidden="true"
        class="size-3.5 flex-none self-center text-cat opacity-35 transition-[opacity,translate] duration-[200ms,400ms] ease-spring icon-[lucide--chevron-right] group-hover/row:translate-x-0.5 group-hover/row:opacity-100 group-focus-visible/row:opacity-100"
      />
    </a>
  </div>
</template>
