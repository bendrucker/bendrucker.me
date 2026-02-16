<script setup lang="ts">
defineProps<{
  year: number;
}>();
</script>

<template>
  <div
    :data-year="year"
    class="sticky z-10 border-b border-border bg-background"
    :style="{ top: 'var(--header-height, 8.5rem)' }"
  >
    <h2 class="text-2xl font-bold text-accent py-3">{{ year }}</h2>
  </div>
</template>
