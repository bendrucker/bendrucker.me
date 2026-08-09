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
import { computed } from "vue";
import StravaLink from "./StravaLink.vue";
import type { RidePhoto } from "./types";

const props = defineProps<{
  photos: RidePhoto[];
  index: number;
  rideName: string;
  rideUrl: string;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "update:index": [index: number];
}>();

const count = computed(() => props.photos.length);

/** An out of range index still lands on a real photo rather than blanking. */
const position = computed(() =>
  count.value > 0
    ? ((props.index % count.value) + count.value) % count.value
    : 0,
);

const photo = computed<RidePhoto | undefined>(
  () => props.photos[position.value],
);

const instructions = computed(() =>
  count.value > 1
    ? `Photo gallery with ${count.value} photos. Use the left and right arrow keys to move between them.`
    : "A single photo from this ride.",
);

function step(delta: number) {
  if (count.value < 2) return;
  emit("update:index", (position.value + delta + count.value) % count.value);
}

function onOpenChange(value: boolean) {
  if (!value) emit("close");
}
</script>

<template>
  <DialogRoot :open="open && count > 0" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-background/95" />
      <DialogContent
        class="fixed inset-x-4 top-1/2 z-50 mx-auto flex w-fit max-w-3xl -translate-y-1/2 flex-col gap-2"
        @keydown.arrow-left.prevent="step(-1)"
        @keydown.arrow-right.prevent="step(1)"
      >
        <DialogTitle class="sr-only">{{ rideName }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ instructions }}
        </DialogDescription>

        <div class="relative">
          <img
            v-if="photo"
            :key="photo.id"
            :src="photo.fullUrl"
            :alt="photo.alt"
            class="max-h-[75vh] max-w-full rounded-lg border border-border object-contain"
          />

          <button
            v-if="count > 1"
            type="button"
            class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-border bg-background/90 px-2.5 py-1 text-foreground"
            @click="step(-1)"
          >
            <span aria-hidden="true">‹</span>
            <span class="sr-only">Previous photo</span>
          </button>

          <button
            v-if="count > 1"
            type="button"
            class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-border bg-background/90 px-2.5 py-1 text-foreground"
            @click="step(1)"
          >
            <span aria-hidden="true">›</span>
            <span class="sr-only">Next photo</span>
          </button>
        </div>

        <div class="flex items-center gap-3 text-[11px] text-foreground/60">
          <p class="shrink-0">
            <span aria-hidden="true">{{ position + 1 }} / {{ count }}</span>
            <span class="sr-only" aria-live="polite">
              Photo {{ position + 1 }} of {{ count }}
            </span>
          </p>
          <p class="min-w-0 max-w-[36ch] truncate text-foreground/80">
            {{ rideName }}
          </p>
          <div class="ml-auto flex items-center gap-3">
            <StravaLink :href="rideUrl" />
            <DialogClose class="text-foreground/60">
              <span aria-hidden="true">✕</span>
              <span class="sr-only">Close photo viewer</span>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
