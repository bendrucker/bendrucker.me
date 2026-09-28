<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  provide,
  useTemplateRef,
  watch,
} from "vue";
import { DETAIL_PORTAL } from "@/detail/portal";

const props = defineProps<{
  open: boolean;
  /** The dialog's accessible name: the item's title, or its noun while it loads. */
  label: string;
  /** "ride", "repository": what failed to load, when something did. */
  noun: string;
  /** The item's own page. */
  fullHref?: string;
  /** The list without the item, which closing leaves without script. */
  closeHref: string;
  loading: boolean;
  failed: boolean;
  /** Whether the item leads with a hero, like a ride's map, for the placeholder to match. */
  hero?: boolean;
}>();

const emit = defineEmits<{
  /** The reader asked to close: the button, Esc, or the backdrop. */
  close: [];
  /** The dialog has closed and the list behind it takes input again. */
  closed: [];
}>();

const dialog = useTemplateRef<HTMLDialogElement>("dialog");
provide(DETAIL_PORTAL, dialog);

// A shared link renders the modal open on the server, where it has to show
// without script. The attribute is read once: from hydration on, whether the
// dialog is open is the browser's to track.
const renderedOpen = props.open || undefined;

let lockedOverflow: string | null = null;

function lockScroll() {
  if (lockedOverflow !== null) return;
  const root = document.documentElement;
  lockedOverflow = root.style.overflow;
  // Holding the scrollbar's gutter keeps the list from shifting sideways as
  // its scrollbar goes.
  if (window.innerWidth > root.clientWidth) {
    root.style.scrollbarGutter = "stable";
  }
  root.style.overflow = "hidden";
}

function unlockScroll() {
  if (lockedOverflow === null) return;
  const root = document.documentElement;
  root.style.overflow = lockedOverflow;
  root.style.removeProperty("scrollbar-gutter");
  lockedOverflow = null;
}

function show({ instant = false } = {}) {
  const element = dialog.value;
  if (element === null) return;
  // The server's dialog is open but not modal. It closes and reopens modal to
  // take the focus trap and the inert list, without animating a second time.
  if (element.open && !element.matches(":modal")) {
    element.style.transition = "none";
    element.close();
  }
  if (!element.open) element.showModal();
  if (instant) {
    requestAnimationFrame(() => element.style.removeProperty("transition"));
  }
  lockScroll();
}

function hide() {
  const element = dialog.value;
  if (element?.open) element.close();
  unlockScroll();
  emit("closed");
}

watch(
  () => props.open,
  (open) => {
    if (open) show();
    else hide();
  },
);

/** Set while Esc belongs to a viewer opened inside the modal, which closes first. */
let escapeTaken = false;

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  escapeTaken =
    dialog.value?.querySelector('[role="dialog"][data-state="open"]') != null;
}

function onCancel(event: Event) {
  event.preventDefault();
  if (escapeTaken) {
    escapeTaken = false;
    return;
  }
  emit("close");
}

// Chrome closes a dialog outright on a second Esc with no click between, even
// when the first cancel was prevented. The URL still has to follow. The event
// is queued, so one from `show()` reopening the server's dialog arrives with
// the dialog open again, and is ignored.
function onClose() {
  if (props.open && dialog.value?.open === false) emit("close");
}

let pressedBackdrop = false;

function onPointerDown(event: PointerEvent) {
  pressedBackdrop = event.target === dialog.value;
}

function onClick(event: MouseEvent) {
  // The dialog's contents fill it, so only a press on the backdrop targets
  // the dialog itself. A drag out of the contents ends here too, and doesn't
  // count.
  if (event.target === dialog.value && pressedBackdrop) emit("close");
  pressedBackdrop = false;
}

onMounted(() => {
  // Registered before any viewer inside the modal registers its own, so this
  // sees a viewer still open when Esc arrives.
  document.addEventListener("keydown", onKeydown, { capture: true });
  if (props.open) show({ instant: true });
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown, { capture: true });
  unlockScroll();
});
</script>

<template>
  <!-- A bottom sheet on a phone and a centred dialog from the desktop
       breakpoint up, switched in CSS. The sheet has a fixed height so its
       contents scroll inside it and a load doesn't resize it. -->
  <dialog
    ref="dialog"
    data-detail-modal
    :open="renderedOpen"
    :aria-label="label"
    :aria-busy="loading ? 'true' : undefined"
    class="fixed inset-x-0 top-auto bottom-0 m-0 h-[92dvh] max-h-none w-full max-w-none flex-col overflow-hidden rounded-t-2xl border-0 bg-background p-0 text-foreground shadow-[0_-8px_32px_var(--shadow)] transition-[translate,opacity,overlay,display] transition-discrete duration-300 ease-settle not-open:translate-y-full backdrop:bg-black/45 open:flex motion-reduce:transition-none md:inset-0 md:m-auto md:h-fit md:max-h-[min(88dvh,920px)] md:min-h-[min(480px,88dvh)] md:w-[min(680px,calc(100vw-32px))] md:rounded-2xl md:shadow-[0_24px_64px_var(--shadow)] md:not-open:translate-y-3 md:not-open:opacity-0 starting:open:translate-y-full md:starting:open:translate-y-3 md:starting:open:opacity-0 [&:not(:modal)]:z-50 [&:not(:modal)]:shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]"
    @cancel="onCancel"
    @close="onClose"
    @pointerdown="onPointerDown"
    @click="onClick"
  >
    <div
      class="relative flex flex-none items-center gap-1 border-b border-line px-2 pt-4 pb-1.5 md:px-3 md:pt-2"
    >
      <span
        aria-hidden="true"
        class="absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-dim/35 md:hidden"
      />
      <a
        v-if="fullHref"
        :href="fullHref"
        class="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[13px] text-cat no-underline hover:bg-hover focus-visible:outline-2 focus-visible:outline-cat"
      >
        <span aria-hidden="true" class="size-3.5 icon-[lucide--maximize-2]" />
        Full page
      </a>
      <a
        :href="closeHref"
        aria-label="Close"
        title="Close"
        class="ml-auto inline-flex size-9 items-center justify-center rounded-lg text-dim no-underline transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat"
        @click.prevent="emit('close')"
      >
        <span aria-hidden="true" class="size-[18px] icon-[lucide--x]" />
      </a>
    </div>

    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-10 md:px-8 md:pt-5 md:pb-8"
    >
      <div
        v-if="failed"
        class="flex flex-col items-start gap-3 py-10 text-[15px] text-dim"
      >
        <p>This {{ noun }} didn't load.</p>
        <a
          v-if="fullHref"
          :href="fullHref"
          class="text-cat underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-cat"
        >
          Open its page
        </a>
      </div>
      <!-- Stands in at the shape the item takes: a hero where it has one, a
           title, a row of tiles, and a list, so the dialog holds its size as
           the item arrives. -->
      <div
        v-else-if="loading"
        aria-hidden="true"
        class="flex animate-pulse flex-col gap-4 motion-reduce:animate-none md:gap-5"
      >
        <div v-if="hero" class="aspect-[600/320] w-full rounded-2xl tint-10" />
        <div class="flex flex-col gap-2">
          <div class="h-3 w-24 rounded tint-10" />
          <div class="h-7 w-3/4 rounded-md tint-10" />
        </div>
        <div class="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          <div class="h-16 rounded-xl tint-6" />
          <div class="h-16 rounded-xl tint-6" />
          <div class="h-16 rounded-xl tint-6" />
        </div>
        <div v-if="!hero" class="flex flex-col gap-3">
          <div v-for="line in 5" :key="line" class="h-9 rounded-md tint-6" />
        </div>
      </div>
      <slot v-else />
    </div>
  </dialog>
</template>
