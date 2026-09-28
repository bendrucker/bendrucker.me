<script setup lang="ts">
import { computed, useSlots } from "vue";
import { category, type CategoryId } from "@/categories";
import type { RouteNote } from "@/notes";

export type RouteRegion = "views" | "tools" | "sidebar" | "highlights";

const props = defineProps<{
  id: CategoryId;
  /**
   * Which regions have content. Astro hands a Vue component every named slot
   * its template mentions, filled or not, so `RouteLayout` says which it filled.
   */
  regions?: Partial<Record<RouteRegion, boolean>>;
  note?: RouteNote;
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
        <div v-if="shows('views')" class="md:sidebar-open:hidden">
          <slot name="views" />
        </div>
      </div>

      <!-- The owner's note on the page, set like the notes on a book: dim,
           italic, and ruled in the category's color, so it reads as an aside
           rather than a headline. Only its first line shows until a reader
           opens it. The body is first-party Markdown from `src/content/notes`. -->
      <details
        v-if="note?.html"
        class="group/note mt-2 max-w-[62ch] border-l-2 border-cat/40 pl-3 text-xs leading-normal text-dim italic md:mt-3"
      >
        <summary
          class="cursor-pointer list-none rounded-sm focus-visible:outline-2 focus-visible:outline-cat [&::-webkit-details-marker]:hidden"
        >
          {{ note.lede }}
          <span
            class="ml-1 whitespace-nowrap text-cat not-italic group-open/note:hidden"
            >More</span
          >
        </summary>
        <!-- eslint-disable-next-line vue/no-v-html -- first-party Markdown -->
        <div class="mt-2 flex flex-col gap-2" v-html="note.html" />
      </details>
      <p
        v-else-if="note"
        class="mt-2 max-w-[62ch] border-l-2 border-cat/40 pl-3 text-xs leading-normal text-dim italic md:mt-3"
      >
        {{ note.lede }}
      </p>

      <div
        v-if="shows('tools')"
        class="sticky top-12 z-10 -mx-4 tool-row tint-5 px-4 py-2 md:top-18 md:mx-0 md:max-w-[714px] md:px-0 md:sidebar-open:hidden"
      >
        <!-- `/sidebar.js` owns both sidebar buttons, so they work the same in
             an island and on a page that never hydrates. This one brings a
             collapsed sidebar back, from the row that stands in for it. -->
        <button
          v-if="shows('sidebar')"
          type="button"
          data-sidebar-toggle
          :aria-controls="`${cat.id}-sidebar`"
          aria-label="Sidebar"
          class="hidden size-8 flex-none items-center justify-center rounded-[8px] text-dim transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat md:sidebar-collapsed:inline-flex"
        >
          <span
            aria-hidden="true"
            class="size-4 icon-[lucide--panel-left-open]"
          />
        </button>
        <slot name="tools" />
      </div>

      <div
        class="md:mt-5 md:grid md:items-start md:gap-x-2.5 md:sidebar-collapsed:grid-cols-[minmax(0,714px)] md:sidebar-open:grid-cols-[236px_minmax(0,714px)]"
      >
        <aside
          v-if="shows('sidebar')"
          :id="`${cat.id}-sidebar`"
          :aria-label="`${cat.name} controls`"
          class="sticky top-24 flex flex-col gap-5 max-md:hidden sidebar-collapsed:hidden"
        >
          <slot name="sidebar" />
          <button
            type="button"
            data-sidebar-toggle
            :aria-controls="`${cat.id}-sidebar`"
            aria-label="Sidebar"
            class="-mt-2 inline-flex size-7 items-center justify-center self-end rounded-[7px] text-dim transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat"
          >
            <span
              aria-hidden="true"
              class="size-4 icon-[lucide--panel-left-close]"
            />
          </button>
        </aside>
        <div class="min-w-0 md:sidebar-open:col-start-2">
          <section
            v-if="shows('highlights')"
            aria-label="Highlights"
            class="pb-8"
          >
            <slot name="highlights" />
          </section>
          <slot />
        </div>
      </div>
    </div>
  </main>
</template>
