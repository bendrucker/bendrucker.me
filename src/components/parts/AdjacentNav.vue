<script setup lang="ts">
export interface AdjacentLink {
  title: string;
  href: string;
}

defineProps<{
  newer?: AdjacentLink;
  older?: AdjacentLink;
}>();
</script>

<template>
  <nav aria-label="More posts" class="grid grid-cols-2 gap-2">
    <a
      v-if="newer"
      :href="newer.href"
      rel="prev"
      class="col-start-1 flex min-w-0 flex-col gap-1 rounded-xl tint-5 px-3 py-2.5 text-foreground no-underline transition-colors hover:tint-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat"
    >
      <span class="label-caps">Newer</span>
      <span class="line-clamp-2 text-sm leading-snug">{{ newer.title }}</span>
    </a>
    <a
      v-if="older"
      :href="older.href"
      rel="next"
      class="col-start-2 flex min-w-0 flex-col items-end gap-1 rounded-xl tint-5 px-3 py-2.5 text-right text-foreground no-underline transition-colors hover:tint-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat"
    >
      <span class="label-caps">Older</span>
      <span class="line-clamp-2 text-sm leading-snug">{{ older.title }}</span>
    </a>
  </nav>
</template>
