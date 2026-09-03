<script setup lang="ts">
import { ref, useTemplateRef, watch } from "vue";
import type { RidePhoto } from "@/activity/types";

const props = defineProps<{ photos: RidePhoto[] }>();

defineEmits<{ open: [index: number] }>();

const strip = useTemplateRef<HTMLElement>("strip");

/**
 * Whether the row runs past its own edge. The fade is painted only then: a
 * thumbnail that happens to end inside the gradient would otherwise dim with
 * nothing hidden behind it.
 */
const clipped = ref(false);

function measure() {
  const element = strip.value;
  if (element) clipped.value = element.scrollWidth > element.clientWidth;
}

watch(strip, (element, _previous, onCleanup) => {
  if (!element) return;
  const observer = new ResizeObserver(measure);
  observer.observe(element);
  onCleanup(() => observer.disconnect());
});

// Photos added or removed change the row's width without changing the card's,
// which is the one resize the observer never sees.
watch(() => props.photos.length, measure, { flush: "post" });
</script>

<template>
  <ul
    v-if="photos.length > 0"
    ref="strip"
    class="strip flex gap-1.5 overflow-x-auto"
    :class="{ clipped }"
  >
    <li v-for="(photo, index) in photos" :key="photo.id" class="shrink-0">
      <button
        type="button"
        class="block cursor-zoom-in"
        @click="$emit('open', index)"
      >
        <img
          :src="photo.thumbnailUrl"
          alt=""
          aria-hidden="true"
          loading="lazy"
          width="48"
          height="48"
          class="size-12 rounded border border-border object-cover"
        />
        <span class="sr-only">
          Open photo {{ index + 1 }} of {{ photos.length }}: {{ photo.alt }}
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
/* A dozen photos wrapped to a second row and stretched the card past every
   other one in the log. The row stays one row instead, and what does not fit
   fades off its trailing edge. Scrolling still reaches the rest, as does the
   lightbox, which opens on any thumbnail and pages through them all.
   `contain` keeps a swipe past the end from turning into a page-back gesture. */
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
