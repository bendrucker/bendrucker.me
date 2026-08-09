<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    summary?: string;
    as?: string;
  }>(),
  { as: "h2" },
);
</script>

<template>
  <div class="flex items-center gap-2">
    <component
      :is="as"
      class="shrink-0 text-[11px] font-bold tracking-[.1em] whitespace-nowrap"
    >
      {{ label }}
    </component>
    <span
      aria-hidden="true"
      class="min-w-4 flex-1 border-t border-dashed border-border"
    />
    <span
      v-if="summary"
      class="shrink-0 text-[11px] whitespace-nowrap text-foreground/55"
    >
      {{ summary }}
    </span>
  </div>
</template>
