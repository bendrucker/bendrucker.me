<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const rootRef = ref<HTMLDivElement | null>(null);
const pinned = ref(false);

// Mobile browsers collapse their top toolbar as you scroll but keep painting
// page content in the strip behind the status bar, while `top: 0` pins below
// it. Without a backdrop over that strip, cards scrolling past peek out above
// the bar, so extend the background upward once the header is pinned. The 1px
// epsilon absorbs fractional scroll offsets.
function update() {
  const top = rootRef.value?.getBoundingClientRect().top;
  pinned.value = top !== undefined && top <= 1;
}

onMounted(() => {
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", update);
  window.removeEventListener("resize", update);
});

defineExpose({ root: rootRef });
</script>

<template>
  <div
    ref="rootRef"
    :class="pinned ? 'before:block' : 'before:hidden'"
    class="sticky top-0 z-10 bg-background space-y-3 pt-3 -mt-3 pb-3 before:content-[''] before:absolute before:inset-x-0 before:bottom-full before:h-24 before:bg-background before:pointer-events-none after:content-[''] after:absolute after:left-0 after:right-0 after:top-full after:h-6 after:bg-gradient-to-b after:from-background after:to-transparent after:pointer-events-none"
  >
    <slot />
  </div>
</template>
