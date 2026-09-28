<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from "vue";
import type { RideMedia } from "@/activity/types";

const props = withDefaults(
  defineProps<{
    media: RideMedia[];
    /**
     * `thumb` is a card's row of 48px squares. `shot` is a ride page's: each
     * item at its own shape, a snapping strip that bleeds to the edge on a
     * phone and a justified gallery from the desktop breakpoint up. One list
     * serves both, switched in CSS, so the page pays for each image once.
     */
    size?: "thumb" | "shot";
  }>(),
  { size: "thumb" },
);

defineEmits<{ open: [index: number] }>();

const strip = useTemplateRef<HTMLElement>("strip");

/**
 * Width over height, per item, once its image has loaded. Until then a photo
 * is assumed landscape and a video portrait, the shapes a phone shoots most.
 */
const ratios = ref(new Map<string, number>());

function ratioOf(item: RideMedia): number {
  return ratios.value.get(item.id) ?? (item.kind === "video" ? 9 / 16 : 4 / 3);
}

function measureShot(item: RideMedia, image: HTMLImageElement) {
  if (image.naturalHeight === 0) return;
  const ratio = image.naturalWidth / image.naturalHeight;
  if (Math.abs(ratio - ratioOf(item)) < 0.01) return;
  ratios.value = new Map(ratios.value).set(item.id, ratio);
}

function onShotLoad(item: RideMedia, event: Event) {
  if (event.target instanceof HTMLImageElement) measureShot(item, event.target);
}

const shots = useTemplateRef<HTMLElement>("shots");

// A server-rendered shot can finish loading before the component hydrates,
// and its `load` event is gone by then. Those are measured where they stand.
onMounted(() => {
  for (const image of shots.value?.querySelectorAll("img") ?? []) {
    const item = props.media.find((entry) => entry.id === image.dataset.id);
    if (item && image.complete) measureShot(item, image);
  }
});

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
  <!-- The gallery's trailing pseudo-element soaks up a short last row, so its
       items keep the row height rather than stretching to fill it. -->
  <ul
    v-if="media.length > 0 && size === 'shot'"
    ref="shots"
    aria-label="Photos and video"
    class="shots flex gap-2 max-md:-mx-4 max-md:snap-x max-md:snap-mandatory max-md:scroll-px-4 max-md:overflow-x-auto max-md:px-4 md:flex-wrap md:after:grow-[1000] md:after:content-['']"
  >
    <li
      v-for="(item, index) in media"
      :key="item.id"
      class="max-md:shrink-0 max-md:snap-start md:grow-(--r) md:basis-[calc(var(--r)*150px)]"
      :style="{ '--r': ratioOf(item) }"
    >
      <button
        type="button"
        class="group/shot relative block aspect-(--r) cursor-zoom-in overflow-hidden rounded-xl bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat max-md:h-[210px] md:w-full"
        @click="$emit('open', index)"
      >
        <img
          v-if="!posterFailed.has(item.id)"
          :src="item.previewUrl ?? item.thumbnailUrl"
          :data-id="item.id"
          alt=""
          aria-hidden="true"
          loading="lazy"
          :width="Math.round(210 * ratioOf(item))"
          height="210"
          class="block size-full object-cover transition-transform duration-500 ease-spring group-hover/shot:scale-[1.03] motion-reduce:transition-none"
          @load="onShotLoad(item, $event)"
          @error="onPosterError(item)"
        />
        <template v-if="item.kind === 'video'">
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 to-transparent to-45%"
          />
          <span
            aria-hidden="true"
            class="pointer-events-none absolute top-1/2 left-1/2 flex size-10 -translate-1/2 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-md"
          >
            <span class="ml-0.5 icon-[lucide--play] size-4" />
          </span>
        </template>
        <span class="sr-only">
          Open {{ item.kind }} {{ index + 1 }} of {{ media.length }}:
          {{ item.alt }}
        </span>
      </button>
    </li>
  </ul>
  <ul
    v-else-if="media.length > 0"
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
             in either theme. -->
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

.shots {
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.shots::-webkit-scrollbar {
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
