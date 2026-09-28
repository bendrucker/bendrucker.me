<script setup lang="ts">
import { vArtFallback } from "@/components/parts/artFallback";
import { useOutbound } from "./outbound";

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
  /** Past a phone's three: shown from the desktop breakpoint up. */
  desktopOnly?: boolean;
}

defineProps<{ items: readonly ShelfRecord[] }>();

const { playing, open } = useOutbound();

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
    sleeve's side and `--o` the room either side of it, which the record slides
    right into as the sleeve slides left. An album is 1.45 sleeves wide to hold
    its record, and a podcast is a sleeve alone.
  -->
  <ul class="flex gap-3 md:gap-4">
    <li
      v-for="item in items"
      :key="item.key"
      class="@container flex min-w-0 basis-0"
      :class="[
        item.type === 'Album'
          ? 'grow-[1.45] [--s:calc(100cqi/1.45)]'
          : 'grow [--s:100cqi]',
        item.desktopOnly ? 'max-md:hidden' : '',
      ]"
    >
      <a
        :href="item.url"
        target="_blank"
        rel="noopener"
        :data-state="playing === item.key ? 'out' : undefined"
        class="group/album flex w-full min-w-0 flex-col items-center gap-2 text-center text-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid"
        @click="open($event, item.key, item.url)"
      >
        <span
          class="relative block h-(--s)"
          :class="
            item.type === 'Album'
              ? 'w-[calc(var(--s)*1.45)] [--o:calc(var(--s)*.225)]'
              : 'w-(--s) [--o:0px]'
          "
        >
          <!-- Pulling a record: it catches on the sleeve, glides once free,
               and settles with a hair of overshoot. Going back is quicker. -->
          <span
            v-if="item.type === 'Album'"
            aria-hidden="true"
            class="absolute top-[3%] left-[calc(var(--o)+var(--s)*.03)] block size-[calc(var(--s)*.94)] translate-x-[6%] transition-transform duration-350 ease-[cubic-bezier(.45,0,.2,1)] group-hover/album:translate-x-[calc(var(--o)*.85)] group-hover/album:duration-550 group-hover/album:ease-[linear(0,.03_8%,.12_18%,.3_30%,.55_44%,.78_58%,.92_72%,1.015_86%,1)] group-data-[state=out]/album:translate-x-(--o) group-data-[state=out]/album:duration-450 group-data-[state=out]/album:ease-[linear(0,.03_8%,.12_18%,.3_30%,.55_44%,.78_58%,.92_72%,1.015_86%,1)] motion-reduce:transition-none motion-reduce:group-hover/album:translate-x-[6%] motion-reduce:group-data-[state=out]/album:translate-x-[6%]"
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
            class="absolute top-0 left-(--o) block size-(--s) overflow-hidden rounded-[3px] bg-tile shadow-[0_1px_0_rgb(255_255_255/.25)_inset,0_8px_18px_-10px_var(--shadow)] transition-transform duration-350 ease-[cubic-bezier(.45,0,.2,1)] group-hover/album:translate-x-[calc(var(--o)*-.85)] group-hover/album:-rotate-[1.5deg] group-hover/album:delay-40 group-hover/album:duration-500 group-hover/album:ease-[cubic-bezier(.3,.6,.2,1)] group-data-[state=out]/album:translate-x-[calc(var(--o)*-1)] group-data-[state=out]/album:-rotate-3 motion-reduce:transition-none motion-reduce:group-hover/album:translate-x-0 motion-reduce:group-hover/album:rotate-0 motion-reduce:group-data-[state=out]/album:translate-x-0 motion-reduce:group-data-[state=out]/album:rotate-0"
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
              v-if="item.type === 'Podcast'"
              role="img"
              aria-label="Podcast"
              class="absolute top-1 right-1 z-1 flex size-[18px] items-center justify-center rounded-[4px] bg-black/42 text-white"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--podcast] size-[11px]"
              />
            </span>
          </span>
        </span>
        <span class="line-clamp-1 w-full text-[13px]">{{ item.title }}</span>
        <span
          v-if="item.text"
          class="-mt-1 line-clamp-1 w-full text-[11px] text-dim"
          >{{ item.text }}</span
        >
        <span class="sr-only">Opens {{ item.via }}</span>
      </a>
    </li>
  </ul>
</template>
