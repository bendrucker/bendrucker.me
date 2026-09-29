<script setup lang="ts">
import { tickBackground } from "@/media/ticks";
import { vArtFallback } from "@/components/parts/artFallback";
import { useOutbound } from "./outbound";

export interface ShelfPoster {
  key: string;
  type: string;
  title: string;
  /** A show's season, named "S2" beside the title. */
  season?: number;
  art?: string;
  url: string;
  via: string;
  ticks?: readonly number[];
  tickLabel?: string;
  /** Past a phone's three: shown from the desktop breakpoint up. */
  desktopOnly?: boolean;
}

withDefaults(
  defineProps<{
    items: readonly ShelfPoster[];
    /**
     * `home` puts the words above a smaller poster, so a card cut short at its
     * peek still names what's on it and the art stands back from the work.
     */
    layout?: "route" | "home";
  }>(),
  { layout: "route" },
);

const { playing, open } = useOutbound();
</script>

<template>
  <!-- Posters share the row evenly, so three fill a phone and five a desktop. -->
  <ul class="flex gap-2.5 md:gap-3">
    <li
      v-for="item in items"
      :key="item.key"
      class="flex min-w-0 flex-1 basis-0"
      :class="item.desktopOnly ? 'max-md:hidden' : ''"
    >
      <a
        :href="item.url"
        target="_blank"
        rel="noopener"
        :data-state="playing === item.key ? 'out' : undefined"
        class="group/poster flex w-full min-w-0 flex-col gap-1.5 text-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid"
        @click="open($event, item.key, item.url)"
      >
        <span
          class="flex flex-col gap-0.5"
          :class="
            layout === 'home' ? 'order-last mt-1 max-w-14 md:max-w-18' : ''
          "
        >
          <span
            class="relative block aspect-[2/3] w-full overflow-hidden rounded-[4px] bg-foreground/10 shadow-[0_10px_20px_-14px_var(--shadow)] transition-transform duration-350 ease-[cubic-bezier(.34,1.35,.64,1)] group-hover/poster:-translate-y-[3px] group-hover/poster:-rotate-[1.5deg] group-active/poster:scale-96 group-data-[state=out]/poster:-translate-y-1.5 group-data-[state=out]/poster:scale-104 group-data-[state=out]/poster:-rotate-3 after:absolute after:inset-0 after:-translate-x-[130%] after:bg-[linear-gradient(115deg,transparent_30%,rgb(255_255_255/.4)_46%,transparent_62%)] after:transition-transform after:duration-700 after:ease-out after:content-[''] group-hover/poster:after:translate-x-[130%] group-data-[state=out]/poster:after:translate-x-[130%] motion-reduce:transition-none motion-reduce:after:hidden"
          >
            <img
              v-if="item.art"
              v-art-fallback
              :src="item.art"
              alt=""
              width="120"
              height="180"
              loading="lazy"
              decoding="async"
              class="size-full object-cover"
            />
            <span
              v-if="item.type === 'Movie'"
              role="img"
              aria-label="Movie"
              class="absolute top-1 right-1 z-1 flex size-[18px] items-center justify-center rounded-[4px] bg-black/42 text-white"
            >
              <span
                aria-hidden="true"
                class="size-[11px] icon-[lucide--film]"
              />
            </span>
          </span>
          <span
            v-if="item.ticks?.length"
            role="img"
            :aria-label="item.tickLabel"
            class="flex h-[3px] gap-px"
          >
            <span
              v-for="(fraction, i) in item.ticks"
              :key="i"
              class="h-[3px] flex-1 rounded-[1px]"
              :style="{ background: tickBackground(fraction) }"
            />
          </span>
        </span>
        <span class="flex min-w-0 items-baseline gap-1 text-xs leading-[1.35]">
          <span class="line-clamp-1 min-w-0">{{ item.title }}</span>
          <span
            v-if="item.season !== undefined"
            :aria-label="`Season ${item.season}`"
            class="flex-none font-mono text-[10px] text-dim"
            >S{{ item.season }}</span
          >
        </span>
        <span class="sr-only">Opens {{ item.via }}</span>
      </a>
    </li>
  </ul>
</template>
