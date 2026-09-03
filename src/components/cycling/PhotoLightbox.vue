<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { computed, watch } from "vue";
import PhotoCarousel from "./PhotoCarousel.vue";
import StravaLink from "./StravaLink.vue";
import type { RidePhoto } from "@/activity/types";

const props = defineProps<{
  photos: RidePhoto[];
  index: number;
  rideName: string;
  rideUrl?: string;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "update:index": [index: number];
}>();

const count = computed(() => props.photos.length);

/** An out of range index still lands on a real photo rather than blanking. */
const position = computed(() => {
  if (count.value < 1) return 0;
  const whole = Math.trunc(props.index);
  if (!Number.isFinite(whole)) return 0;
  return ((whole % count.value) + count.value) % count.value;
});

/**
 * Keyed on the photo count rather than on the clamped position, so a caller
 * that ignores these events gets one of them, not an endless stream. Emptying
 * the list closes the dialog through the `open` binding, which reka reads as
 * caller-driven and reports nothing back.
 */
watch(
  count,
  (value) => {
    if (value === 0) {
      if (props.open) emit("close");
      return;
    }
    if (position.value !== props.index) emit("update:index", position.value);
  },
  { flush: "post" },
);

const photo = computed<RidePhoto | undefined>(
  () => props.photos[position.value],
);

const instructions = computed(() =>
  count.value > 1
    ? `Photo gallery with ${count.value} photos. Swipe, or use the left and right arrow keys, to move between them.`
    : "A single photo from this ride.",
);

function step(delta: number) {
  if (count.value < 2) return;
  emit("update:index", (position.value + delta + count.value) % count.value);
}

function onOpenChange(value: boolean) {
  if (!value) emit("close");
}

/**
 * One listener rather than two `@keydown.arrow-*` bindings. reka merges `$attrs`
 * onto the content element twice, and two array-literal handlers are never
 * reference-equal, so each arrow press would fire the handler twice.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (count.value < 2) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    step(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    step(1);
  }
}
</script>

<template>
  <DialogRoot :open="open && count > 0" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-background/95" />
      <!-- Sized to the whole viewport, so a photo is as large as the screen
           allows. -->
      <DialogContent
        class="fixed inset-0 z-50 flex flex-col outline-none"
        @keydown="onKeydown"
      >
        <DialogTitle class="sr-only">{{ rideName }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ instructions }}
        </DialogDescription>

        <PhotoCarousel
          :photos="photos"
          :index="position"
          @update:index="emit('update:index', $event)"
        />

        <div
          class="flex shrink-0 items-center gap-3 px-4 pb-4 text-[11px] text-foreground/70"
        >
          <p class="shrink-0">
            <span aria-hidden="true">{{ position + 1 }} / {{ count }}</span>
            <!-- Carries the alt text too. A screen reader does not re-announce
                 an unfocused image whose alt changed under it. -->
            <span class="sr-only" aria-live="polite">
              Photo {{ position + 1 }} of {{ count }}.
              {{ photo?.alt }}
            </span>
          </p>
          <p class="max-w-[36ch] min-w-0 truncate text-foreground/80">
            {{ rideName }}
          </p>
          <div class="ml-auto flex items-center gap-3">
            <StravaLink v-if="rideUrl" :href="rideUrl" :name="rideName" />
            <DialogClose class="text-foreground/70 hover:text-accent">
              <span aria-hidden="true">✕</span>
              <span class="sr-only">Close photo viewer</span>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
