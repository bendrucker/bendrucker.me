<script setup lang="ts">
import { ref, useTemplateRef, watch } from "vue";
import type { RideMedia } from "@/activity/types";

const props = defineProps<{ media: RideMedia[] }>();

defineEmits<{ open: [index: number] }>();

const strip = useTemplateRef<HTMLElement>("strip");

/**
 * Whether items are still hidden past the trailing edge. The fade is painted
 * only then: a thumbnail that ends inside the gradient, because the row fits or
 * because it has been scrolled to its end, would dim with nothing behind it.
 */
const clipped = ref(false);

/**
 * Videos whose poster frame the thumbnail route could not cut. The route
 * answers 404, so the `<img>` would draw a broken icon over the scrim. Hiding
 * it leaves the scrim and the play glyph, which is the tile a poster-less
 * video gets.
 */
const posterFailed = ref(new Set<string>());

function onPosterError(item: RideMedia) {
  if (item.kind !== "video") return;
  posterFailed.value = new Set(posterFailed.value).add(item.id);
}

function measure() {
  const element = strip.value;
  if (!element) return;
  // A pixel of slack, since the two widths round independently and a row that
  // fits exactly can report a stray pixel of overflow at some zoom levels.
  clipped.value =
    element.scrollWidth - element.clientWidth - element.scrollLeft > 1;
}

watch(strip, (element, _previous, onCleanup) => {
  if (!element) return;
  const observer = new ResizeObserver(measure);
  observer.observe(element);
  onCleanup(() => observer.disconnect());
});

// Items added or removed change the row's width without changing the card's,
// which is the one resize the observer never sees.
watch(() => props.media.length, measure, { flush: "post" });
</script>

<template>
  <ul
    v-if="media.length > 0"
    ref="strip"
    class="strip flex gap-1.5 overflow-x-auto"
    :class="{ clipped }"
    @scroll.passive="measure"
  >
    <li v-for="(item, index) in media" :key="item.id" class="shrink-0">
      <button
        type="button"
        class="relative block cursor-zoom-in"
        @click="$emit('open', index)"
      >
        <img
          v-if="!posterFailed.has(item.id)"
          :src="item.thumbnailUrl"
          alt=""
          aria-hidden="true"
          loading="lazy"
          width="48"
          height="48"
          class="size-12 rounded border border-border object-cover"
          @error="onPosterError(item)"
        />
        <!-- Keeps the tile at a thumbnail's size once the poster is gone, so
             the row does not reflow around a video whose frame failed. -->
        <span
          v-else
          class="block size-12 rounded border border-border bg-muted"
        />
        <!-- A literal black dims the photograph underneath and reads the same
             in either theme, which a surface token would not. -->
        <span
          v-if="item.kind === 'video'"
          class="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-black/45"
        >
          <span
            class="icon-[lucide--play] size-4 text-white"
            aria-hidden="true"
          />
        </span>
        <span class="sr-only">
          Open {{ item.kind }} {{ index + 1 }} of {{ media.length }}:
          {{ item.alt }}
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
/* Wrapping the row to a second row would stretch the card past every other one
   in the log, so it stays one row and what does not fit fades off its trailing
   edge. Scrolling still reaches the rest, as does the lightbox, which opens on
   any thumbnail and pages through them all. `contain` keeps a swipe past the
   end from turning into a page-back gesture. */
.strip {
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.strip::-webkit-scrollbar {
  display: none;
}

.clipped {
  mask-image: linear-gradient(
    to right,
    black calc(100% - 2rem),
    transparent 100%
  );
}
</style>
