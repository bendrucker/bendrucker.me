<script setup lang="ts">
import { computed } from "vue";
import { category, type CategoryId } from "@/categories";

const props = defineProps<{
  id: CategoryId;
  /**
   * Rests the drawer taller, for a card that leads with a feature. `phone`
   * raises it only where the cards stack, since on desktop its row partner
   * would stand shorter. `always` raises it at both widths, for a pair of
   * featured cards that share a row.
   */
  tall?: "phone" | "always";
}>();

const cat = computed(() => category(props.id));
const drawerId = computed(() => `${props.id}-drawer`);
</script>

<template>
  <!-- An odd card out spans both columns, so the grid never ends on a gap. It
       counts cards by type because Astro puts the islands' hydration style and
       scripts among them.

       The body is a drawer resting at a peek height, so every card stands the
       same height and a row's cards line up. `src/home/drawer.ts` marks a card
       whose body overruns the peek with `data-size="tall"`, which shows the
       handle, and drives it. Without that script the drawer stays shut and the
       heading still opens the route with everything on it. -->
  <article
    data-drawer-card
    class="group/card relative isolate flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-cat/15 tint-5 px-4 pt-3.5 pb-4 md:px-[18px] md:pt-4 md:pb-[18px] md:[&:nth-of-type(odd):last-of-type]:col-span-2"
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
          class="size-3.5 opacity-50 transition-[opacity,translate] duration-300 ease-spring icon-[lucide--chevron-right] group-hover/head:translate-x-0.5 group-hover/head:opacity-100"
        />
      </a>
    </h2>
    <div
      :id="drawerId"
      data-drawer
      class="drawer"
      :class="
        tall === 'always'
          ? 'drawer-tall'
          : tall === 'phone'
            ? 'drawer-tall-phone'
            : ''
      "
    >
      <div data-drawer-body class="flex flex-col gap-3">
        <slot />
      </div>
    </div>
    <!-- One handle, drawn as a grabber on a phone and a chevron on desktop.
         It sits over the card's foot rather than below the drawer, so showing
         it never changes the card's height. -->
    <button
      type="button"
      data-drawer-toggle
      :aria-controls="drawerId"
      aria-expanded="false"
      :aria-label="`Expand ${cat.name}`"
      class="group/toggle absolute inset-x-0 bottom-0 z-1 hidden h-[22px] cursor-grab touch-none items-center justify-center text-cat group-data-[size=tall]/card:flex group-data-[state=drag]/card:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cat md:inset-x-auto md:left-1/2 md:h-8 md:w-16 md:-translate-x-1/2 md:cursor-pointer md:touch-auto md:items-end md:rounded-md md:pb-1.5"
    >
      <span
        aria-hidden="true"
        class="block h-[5px] w-9 rounded-full bg-current opacity-35 transition-[width,opacity] duration-250 ease-[cubic-bezier(.3,.7,.2,1)] group-active/toggle:w-12 group-active/toggle:opacity-60 group-data-[state=drag]/card:w-12 group-data-[state=drag]/card:opacity-60 md:hidden"
      />
      <span
        aria-hidden="true"
        class="size-4 opacity-55 transition-[rotate,opacity] duration-350 ease-spring icon-[lucide--chevron-down] group-hover/toggle:opacity-100 group-focus-visible/toggle:opacity-100 group-aria-expanded/toggle:rotate-180 max-md:hidden"
      />
    </button>
  </article>
</template>

<style scoped>
@property --drawer-fade {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

/* The peek and the room an open drawer leaves for its handle are read by
   `src/home/drawer.ts`, which sets an open or dragged drawer's height inline.
   The padding keeps a row's focus ring inside the clip. The desktop peek
   holds a poster shelf and five one-line rows whole, so only a list whose rows
   carry notes or orgs grows a drawer there. */
.drawer {
  --drawer-peek: 148px;
  --drawer-room: 8px;
  --drawer-fade: 48px;
  position: relative;
  height: var(--drawer-peek);
  overflow: hidden;
  margin: -4px -4px 0;
  padding: 4px 4px 0;
  mask-image: linear-gradient(
    #000 calc(100% - var(--drawer-fade)),
    transparent
  );
  transition:
    height 0.5s linear(0, 0.18 8%, 0.55 22%, 0.86 38%, 1.02 55%, 1.01 70%, 1),
    --drawer-fade 0.4s;
}

/* A featured card rests tall enough to show its feature whole with a row
   beneath it, so the work Ben does stands taller than what he consumes. */
.drawer-tall,
.drawer-tall-phone {
  --drawer-peek: 280px;
}

@media (width >= 48rem) {
  .drawer {
    --drawer-peek: 208px;
    --drawer-room: 20px;
  }

  .drawer-tall {
    --drawer-peek: 288px;
  }
}

[data-size="fits"] > .drawer,
[data-state="open"] > .drawer {
  --drawer-fade: 0px;
}

[data-state="drag"] > .drawer {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .drawer {
    transition: none;
  }
}
</style>
