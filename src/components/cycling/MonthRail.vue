<script setup lang="ts">
import { computed } from "vue";

interface RailMonth {
  key: string;
  short: string;
  full: string;
}

const props = defineProps<{
  months: { key: string; label: string }[];
  activeKey?: string | null;
}>();

const emit = defineEmits<{
  navigate: [key: string];
}>();

const yearGroups = computed(() => {
  const groups: { year: string; months: RailMonth[] }[] = [];

  for (const month of props.months) {
    const year = month.key.slice(0, 4);
    const name = month.label.split(" ")[0] ?? month.label;
    const entry: RailMonth = {
      key: month.key,
      short: name.slice(0, 3),
      full: `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`,
    };

    const current = groups.at(-1);
    if (current?.year === year) current.months.push(entry);
    else groups.push({ year, months: [entry] });
  }

  return groups;
});
</script>

<template>
  <nav
    v-if="yearGroups.length > 0"
    class="pointer-events-none fixed inset-y-0 right-0 z-20 hidden items-center sm:flex"
    aria-label="Jump to month"
  >
    <ul
      role="list"
      class="pointer-events-auto flex w-11 flex-col gap-2 rounded-l-md border border-r-0 border-border bg-background/85 py-2 backdrop-blur-sm"
    >
      <li v-for="group in yearGroups" :key="group.year">
        <!-- The year names the nested list, so showing it to assistive tech
             here would announce it twice. -->
        <p
          class="px-2 text-right text-[9px] tracking-[.14em] text-foreground/30"
          aria-hidden="true"
        >
          {{ group.year }}
        </p>
        <ul
          role="list"
          :aria-label="group.year"
          class="flex flex-col items-stretch"
        >
          <li v-for="month in group.months" :key="month.key">
            <button
              type="button"
              class="w-full px-2 py-0.5 text-right text-[11px] leading-4 transition-colors"
              :class="
                month.key === activeKey
                  ? 'text-accent font-bold'
                  : 'text-foreground/40 hover:text-foreground/70'
              "
              :aria-current="month.key === activeKey ? 'true' : undefined"
              @click="emit('navigate', month.key)"
            >
              <span aria-hidden="true">{{ month.short }}</span>
              <span class="sr-only">{{ month.full }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
