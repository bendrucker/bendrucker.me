<script setup lang="ts">
import { vArtFallback } from "@/components/parts/artFallback";
import { linkState, useOutbound } from "./outbound";

export interface ShelfRecord {
  key: string;
  /** "Album" slides a record out of its sleeve. "Podcast" is a sleeve alone. */
  type: string;
  title: string;
  /** The artist or host. */
  text?: string;
  art?: string;
  /** The record label's color, ringing the art at the disc's center. */
  label?: string;
  url: string;
  via: string;
  /** Past a phone's four: shown from the desktop breakpoint up. */
  desktopOnly?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: readonly ShelfRecord[];
    /**
     * `home` puts the words above a smaller sleeve, so a card cut short at its
     * peek still names what's on it and the art stands back from the work.
     */
    layout?: "route" | "home";
  }>(),
  { layout: "route" },
);

const { playing, armed, open } = useOutbound();

/** The item's share of the row and its sleeve's side, capped on home. */
function itemSize(type: string): string {
  const home = props.layout === "home";
  if (type === "Album") {
    return home
      ? "grow [--s:100cqi] md:grow-[1.45] md:[--s:min(calc(100cqi/1.45),72px)]"
      : "grow-[1.45] [--s:calc(100cqi/1.45)]";
  }
  return home
    ? "grow [--s:100cqi] md:[--s:min(100cqi,72px)]"
    : "grow [--s:100cqi]";
}

/**
 * Vinyl: the label at the center in the album's color, a pair of highlights
 * catching the light, and the grooves. `--lab` is the label color.
 */
const VINYL = [
  "radial-gradient(circle, var(--background) 0 5%, var(--lab) 6% 30%, var(--vinyl) 31%)",
  "conic-gradient(from 20deg, transparent 0 10%, rgb(255 255 255 / 0.22) 14%, transparent 18% 60%, rgb(255 255 255 / 0.14) 64%, transparent 68%)",
  "repeating-radial-gradient(circle, var(--vinyl) 0 1.5px, #34343a 1.5px 2.5px)",
].join(", ");
</script>

<template>
  <!--
    Each item sizes itself from its own width, a container: `--s` is the
    sleeve's side, `--o` how far the record slides right as the sleeve slides
    left, and `--p` the sleeve's inset. An album is 1.45 sleeves wide to hold
    its record, and a podcast is a sleeve alone. On home a desktop's sleeve
    stops at 72px, matching the posters' width, and the item's leftover width
    goes to its words. A phone's home album is a sleeve wide like a podcast, so
    four sleeves fill the row, and its record slides over the gap as it leaves.
  -->
  <ul class="flex gap-3 md:gap-4">
    <li
      v-for="item in items"
      :key="item.key"
      class="@container flex min-w-0 basis-0"
      :class="[itemSize(item.type), item.desktopOnly ? 'max-md:hidden' : '']"
    >
      <a
        :href="item.url"
        target="_blank"
        rel="noopener"
        :data-key="item.key"
        :data-state="linkState(item.key, playing, armed)"
        class="group/album flex w-full min-w-0 flex-col items-center gap-2 text-center text-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid"
        @click="open($event, item.key, item.url)"
      >
        <span
          class="relative block h-(--s)"
          :class="[
            item.type === 'Album'
              ? 'w-[calc(var(--s)*1.45)] [--o:calc(var(--s)*.225)] [--p:var(--o)]'
              : 'w-(--s) [--o:0px] [--p:0px]',
            layout === 'home'
              ? 'order-last mt-0.5 max-md:w-(--s) max-md:[--p:0px]'
              : '',
          ]"
        >
          <!-- Pulling a record: it catches on the sleeve, glides once free,
               and settles with a hair of overshoot. Going back is quicker. -->
          <span
            v-if="item.type === 'Album'"
            aria-hidden="true"
            class="absolute top-[3%] left-[calc(var(--p)+var(--s)*.03)] block size-[calc(var(--s)*.94)] translate-x-[6%] transition-transform duration-350 ease-[cubic-bezier(.45,0,.2,1)] group-hover/album:translate-x-[calc(var(--o)*.85)] group-hover/album:duration-550 group-hover/album:ease-[linear(0,.03_8%,.12_18%,.3_30%,.55_44%,.78_58%,.92_72%,1.015_86%,1)] group-data-[state=out]/album:translate-x-(--o) group-data-[state=out]/album:duration-450 group-data-[state=out]/album:ease-[linear(0,.03_8%,.12_18%,.3_30%,.55_44%,.78_58%,.92_72%,1.015_86%,1)] motion-reduce:transition-none motion-reduce:group-hover/album:translate-x-[6%] motion-reduce:group-data-[state=out]/album:translate-x-[6%]"
          >
            <!-- The record only turns once it has cleared the sleeve. -->
            <span
              class="relative block size-full rounded-full group-hover/album:animate-[spin_2.4s_linear_.45s_infinite] group-data-[state=out]/album:animate-[spin_1.6s_linear_.35s_infinite] motion-reduce:animate-none! motion-reduce:group-hover/album:animate-none! motion-reduce:group-data-[state=out]/album:animate-none!"
              :style="{ '--lab': item.label ?? '#8b8b8b', background: VINYL }"
            >
              <span
                v-if="item.art"
                class="absolute inset-[32%] rounded-full bg-cover bg-center after:absolute after:inset-[43%] after:rounded-full after:bg-background after:content-['']"
                :style="{ backgroundImage: `url(${item.art})` }"
              />
            </span>
          </span>
          <!-- The sleeve is the hand holding still: it gives way a beat after
               the pull starts. -->
          <span
            class="absolute top-0 left-(--p) block size-(--s) overflow-hidden rounded-[3px] bg-tile shadow-[0_1px_0_rgb(255_255_255/.25)_inset,0_8px_18px_-10px_var(--shadow)] transition-transform duration-350 ease-[cubic-bezier(.45,0,.2,1)] group-hover/album:translate-x-[calc(var(--o)*-.85)] group-hover/album:-rotate-[1.5deg] group-hover/album:delay-40 group-hover/album:duration-500 group-hover/album:ease-[cubic-bezier(.3,.6,.2,1)] group-data-[state=out]/album:translate-x-[calc(var(--o)*-1)] group-data-[state=out]/album:-rotate-3 motion-reduce:transition-none motion-reduce:group-hover/album:translate-x-0 motion-reduce:group-hover/album:rotate-0 motion-reduce:group-data-[state=out]/album:translate-x-0 motion-reduce:group-data-[state=out]/album:rotate-0"
          >
            <img
              v-if="item.art"
              v-art-fallback
              :src="item.art"
              alt=""
              width="120"
              height="120"
              loading="lazy"
              decoding="async"
              class="size-full object-cover"
            />
            <span
              aria-hidden="true"
              class="pointer-events-none absolute inset-x-0 bottom-0 z-1 translate-y-2 bg-linear-to-t from-black/85 via-black/60 to-transparent px-1.5 pt-8 pb-1.5 text-left text-[11px] leading-tight text-white opacity-0 transition duration-200 group-data-[state=armed]/album:translate-y-0 group-data-[state=armed]/album:opacity-100 motion-reduce:transition-none"
            >
              <span class="line-clamp-3">{{ item.title }}</span>
            </span>
            <span
              aria-hidden="true"
              class="pointer-events-none absolute top-1 left-1 z-2 flex size-5 items-center justify-center rounded-[5px] bg-black/55 text-white opacity-0 transition-opacity duration-200 group-hover/album:opacity-100 group-focus-visible/album:opacity-100 group-data-[state=armed]/album:opacity-100"
            >
              <span class="size-3 icon-[lucide--arrow-up-right]" />
            </span>
            <span
              v-if="item.type === 'Podcast'"
              role="img"
              aria-label="Podcast"
              class="absolute top-1 right-1 z-1 flex size-[18px] items-center justify-center rounded-[4px] bg-black/42 text-white"
            >
              <span
                aria-hidden="true"
                class="size-[11px] icon-[lucide--podcast]"
              />
            </span>
          </span>
        </span>
        <span
          class="w-full leading-snug pointer-coarse:sr-only"
          :class="
            layout === 'home'
              ? 'line-clamp-1 text-xs'
              : 'line-clamp-2 text-sm text-balance'
          "
          >{{ item.title }}</span
        >
        <span
          v-if="item.text"
          class="line-clamp-1 w-full text-dim pointer-coarse:sr-only"
          :class="layout === 'home' ? '-mt-1.5 text-[11px]' : '-mt-1 text-xs'"
          >{{ item.text }}</span
        >
        <span class="sr-only">Opens {{ item.via }}</span>
      </a>
    </li>
  </ul>
</template>
