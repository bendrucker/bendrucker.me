<script setup lang="ts">
import { computed } from "vue";
import { category, type CategoryId } from "@/categories";

const props = defineProps<{ id: CategoryId }>();

const cat = computed(() => category(props.id));
</script>

<template>
  <!-- An odd card out spans both columns, so the grid never ends on a gap. It
       counts cards by type because Astro puts the islands' hydration style and
       scripts among them. -->
  <article
    class="relative isolate flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-cat/15 tint-5 px-4 pt-3.5 pb-4 md:px-[18px] md:pt-4 md:pb-[18px] md:[&:nth-of-type(odd):last-of-type]:col-span-2"
    :class="cat.scope"
  >
    <span
      aria-hidden="true"
      class="absolute -top-3 -right-2.5 -z-10 size-[60px] text-cat opacity-8 md:-right-3.5 md:size-[76px]"
      :class="cat.icon"
    />
    <h2>
      <a
        :href="cat.route"
        class="group/head -mx-1.5 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 font-mono text-[15px] font-bold text-cat no-underline hover:bg-hover focus-visible:outline-2 focus-visible:outline-cat md:text-base"
      >
        <span aria-hidden="true" class="size-4" :class="cat.icon" />
        {{ cat.name }}
        <span
          aria-hidden="true"
          class="icon-[lucide--chevron-right] size-3.5 opacity-50 transition-[opacity,translate] duration-300 ease-spring group-hover/head:translate-x-0.5 group-hover/head:opacity-100"
        />
      </a>
    </h2>
    <slot />
  </article>
</template>
