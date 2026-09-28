<script setup lang="ts">
export interface TagChip {
  name: string;
  href: string;
}

defineProps<{ tags: readonly TagChip[] }>();
</script>

<template>
  <ul class="flex flex-wrap gap-1.5" aria-label="Tags">
    <li v-for="tag in tags" :key="tag.href">
      <a
        :href="tag.href"
        class="inline-flex min-h-8 items-center gap-1.5 rounded-lg tint-8 px-2.5 text-[13px] text-foreground no-underline transition-colors hover:tint-16 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat"
      >
        <span aria-hidden="true" class="icon-[lucide--tag] size-3 text-cat" />
        {{ tag.name }}
      </a>
    </li>
  </ul>
</template>
