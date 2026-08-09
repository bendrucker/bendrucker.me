<script setup lang="ts">
// Story scaffolding for MonthRail, and the reference implementation of the
// `navigate` handler a real page has to supply.
import { computed, ref } from "vue";
import MonthRail from "./MonthRail.vue";
import { scrollToSection, useScrollSpy } from "./useScrollSpy";

const props = defineProps<{
  months: { key: string; label: string }[];
}>();

const root = ref<HTMLElement | null>(null);
const keys = computed(() => props.months.map((month) => month.key));
const activeKey = useScrollSpy(keys, { root });
</script>

<template>
  <div ref="root" class="bg-background px-4 pb-[70vh] text-foreground sm:pr-16">
    <p class="py-4 text-[11px] text-foreground/70">
      scroll, or use the rail. the active month follows the section crossing the
      top of the viewport.
    </p>

    <section
      v-for="month in months"
      :key="month.key"
      :data-month-key="month.key"
      tabindex="-1"
      class="min-h-[70vh] scroll-mt-4 border-t border-border py-6"
    >
      <h2 class="text-[13px] font-bold tracking-[.1em]">{{ month.label }}</h2>
      <p class="text-[11px] text-foreground/70">{{ month.key }}</p>
    </section>

    <MonthRail
      :months="months"
      :active-key="activeKey"
      @navigate="scrollToSection(root, $event)"
    />
  </div>
</template>
