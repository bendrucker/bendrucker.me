<script setup lang="ts">
import { computed, useSlots } from "vue";
import { category, type CategoryId } from "@/categories";

export type RouteRegion = "views" | "tools" | "sidebar" | "highlights";

const props = defineProps<{
  id: CategoryId;
  /**
   * Which regions have content. Astro hands a Vue component every named slot
   * its template mentions, filled or not, so `RouteLayout` says which it filled.
   */
  regions?: Partial<Record<RouteRegion, boolean>>;
}>();

const slots = useSlots();

const cat = computed(() => category(props.id));

function shows(region: RouteRegion): boolean {
  return props.regions?.[region] ?? Boolean(slots[region]);
}
</script>

<template>
  <!-- Phone and desktop each get their own copy of the controls, switched in
       CSS: the phone's sticky tool row and the desktop's sidebar differ in more
       than layout, and a width check in script would flash the wrong one on
       first paint. -->
  <main id="main-content" class="flex-1 tint-5 pb-12" :class="cat.scope">
    <div class="mx-auto max-w-[1060px] px-4 pt-4 md:px-12 md:pt-10">
      <div class="flex min-h-11 items-center justify-between gap-3">
        <h1
          class="inline-flex items-center gap-2 font-mono text-[22px] leading-none font-bold text-cat md:text-[28px]"
        >
          <span
            aria-hidden="true"
            class="size-[22px] md:size-7"
            :class="cat.icon"
          />
          {{ cat.name }}
        </h1>
        <div v-if="shows('views')" class="md:hidden">
          <slot name="views" />
        </div>
      </div>

      <div
        v-if="shows('tools')"
        class="sticky top-0 z-10 -mx-4 flex items-center gap-2 tint-5 px-4 py-2 md:hidden"
      >
        <slot name="tools" />
      </div>

      <div
        class="md:mt-5 md:grid md:grid-cols-[236px_minmax(0,714px)] md:items-start md:gap-x-2.5"
      >
        <aside
          v-if="shows('sidebar')"
          :aria-label="`${cat.name} controls`"
          class="sticky top-6 flex flex-col gap-5 max-md:hidden"
        >
          <slot name="sidebar" />
        </aside>
        <div class="min-w-0 md:col-start-2">
          <section v-if="shows('highlights')" aria-label="Highlights">
            <slot name="highlights" />
          </section>
          <slot />
        </div>
      </div>
    </div>
  </main>
</template>
