<script setup lang="ts">
import emblaCarouselVue from "embla-carousel-vue";
import { watch } from "vue";
import type { RideMedia } from "@/activity/types";
import { withinVideo } from "./mediaTarget";

const props = defineProps<{ media: RideMedia[]; index: number }>();

const emit = defineEmits<{ "update:index": [index: number] }>();

/**
 * Embla reads its options and its element once, from its own `onMounted`, so
 * this lives in a component that mounts with the open dialog. That is also
 * what makes `startIndex` the item the strip was clicked on.
 */
const [viewport, embla] = emblaCarouselVue({
  loop: true,
  duration: 18,
  startIndex: props.index,
  watchDrag: (_api, event) => !withinVideo(event.target),
});

// A drag is the one way the position moves without passing through the model.
watch(embla, (api, _previous, onCleanup) => {
  if (!api) return;
  const select = () => emit("update:index", api.selectedScrollSnap());
  api.on("select", select);
  onCleanup(() => api.off("select", select));
});

watch(
  () => props.index,
  (value) => {
    const api = embla.value;
    if (api && api.selectedScrollSnap() !== value) api.scrollTo(value);
    // A video paged away from keeps playing, and its sound follows the reader
    // onto the next slide.
    for (const element of viewport.value?.querySelectorAll("video") ?? []) {
      if (element.dataset.index !== String(value)) element.pause();
    }
  },
);

// Slides added or removed under an open carousel leave Embla measuring a list
// that no longer exists. Measuring again needs the new slides in the DOM.
watch(
  () => props.media.length,
  () => embla.value?.reInit(),
  {
    flush: "post",
  },
);

function step(delta: number) {
  const count = props.media.length;
  if (count < 2) return;
  emit("update:index", (props.index + delta + count) % count);
}
</script>

<template>
  <div class="relative flex min-h-0 flex-1 items-center">
    <div ref="viewport" class="h-full w-full overflow-hidden">
      <div class="flex h-full">
        <!-- The horizontal padding is the arrows' gutter. Below `sm` there is
             no room to spend on one, and the drag Embla gives us is the
             gesture a phone already expects. -->
        <div
          v-for="(item, slide) in media"
          :key="item.id"
          class="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-2 py-4 sm:px-20"
        >
          <!-- `preload="none"` is what keeps opening the lightbox on a photo
               from pulling every video in the ride. -->
          <video
            v-if="item.kind === 'video'"
            :src="item.fullUrl"
            :data-index="slide"
            :aria-label="item.alt"
            controls
            playsinline
            preload="none"
            class="max-h-full max-w-full rounded-lg"
          />
          <img
            v-else
            :src="item.fullUrl"
            :alt="item.alt"
            decoding="async"
            class="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      </div>
    </div>

    <button
      v-if="media.length > 1"
      type="button"
      class="absolute left-3 hidden size-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground hover:text-accent sm:flex"
      @click="step(-1)"
    >
      <span class="icon-[lucide--chevron-left] size-5" aria-hidden="true" />
      <span class="sr-only">Previous item</span>
    </button>

    <button
      v-if="media.length > 1"
      type="button"
      class="absolute right-3 hidden size-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground hover:text-accent sm:flex"
      @click="step(1)"
    >
      <span class="icon-[lucide--chevron-right] size-5" aria-hidden="true" />
      <span class="sr-only">Next item</span>
    </button>
  </div>
</template>
