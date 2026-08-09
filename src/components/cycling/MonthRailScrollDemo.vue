<script setup lang="ts">
import { computed } from "vue";
import MonthRail from "./MonthRail.vue";
import { useScrollSpy } from "./useScrollSpy";

const props = defineProps<{
  months: { key: string; label: string }[];
}>();

const keys = computed(() => props.months.map((month) => month.key));
const activeKey = useScrollSpy(keys);

function scrollToMonth(key: string) {
  document
    .querySelector(`[data-month-key="${key}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="bg-background px-4 pb-[70vh] text-foreground sm:pr-16">
    <p class="py-4 text-[11px] text-foreground/55">
      scroll, or use the rail. the active month follows the section crossing the
      top of the viewport.
    </p>

    <section
      v-for="month in months"
      :key="month.key"
      :data-month-key="month.key"
      class="min-h-[70vh] scroll-mt-4 border-t border-border py-6"
    >
      <h2 class="text-[13px] font-bold tracking-[.1em]">{{ month.label }}</h2>
      <p class="text-[11px] text-foreground/55">{{ month.key }}</p>
    </section>

    <MonthRail
      :months="months"
      :active-key="activeKey"
      @navigate="scrollToMonth"
    />
  </div>
</template>
