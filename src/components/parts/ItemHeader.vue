<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    /** Where the back link returns: "Code", "Home", or a project's name. */
    backLabel?: string;
    backHref?: string;
    /** The date over the title, already formatted. */
    date?: string;
    /** The owner above the title, when it isn't you. */
    org?: string;
    /** Your description, under the title. */
    dek?: string;
    /** A post's title runs larger than an item page's. */
    size?: "page" | "post";
    /** Names the title for a view transition from its row. */
    transitionName?: string;
    /** A page's title is its `h1`. In a modal over a list, whose `h1` is the list's, it is an `h2`. */
    level?: 1 | 2;
  }>(),
  { size: "page", level: 1 },
);
</script>

<template>
  <header class="flex flex-col gap-2">
    <a
      v-if="backHref && backLabel"
      :href="backHref"
      class="-ml-1.5 inline-flex min-h-8 items-center gap-1 self-start rounded-md px-1.5 text-[13px] text-cat no-underline hover:bg-hover focus-visible:outline-2 focus-visible:outline-cat"
    >
      <span aria-hidden="true" class="icon-[lucide--chevron-left] size-3.5" />
      {{ backLabel }}
    </a>
    <slot name="hero" />
    <div class="flex items-start gap-3">
      <slot name="lead" />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p v-if="date" class="label-caps">{{ date }}</p>
        <p v-if="org" class="text-[13px] text-dim">{{ org }}</p>
        <!-- A mark before the title or an action after it shares its line.
             Without either the wrapper is `contents`, and lays out as if
             absent. -->
        <div
          :class="
            $slots.mark || $slots['title-end']
              ? 'flex items-center gap-2.5'
              : 'contents'
          "
        >
          <slot name="mark" />
          <component
            :is="level === 2 ? 'h2' : 'h1'"
            class="min-w-0 font-bold tracking-[-0.01em] wrap-anywhere text-foreground"
            :class="
              size === 'post'
                ? 'text-[26px] leading-[1.15] md:text-[34px]'
                : 'text-2xl leading-[1.2] md:text-3xl'
            "
            :style="
              transitionName
                ? { viewTransitionName: transitionName }
                : undefined
            "
          >
            {{ title }}
          </component>
          <slot name="title-end" />
        </div>
        <p
          v-if="dek"
          class="text-dim"
          :class="
            size === 'post'
              ? 'text-[17px] leading-normal md:text-[19px]'
              : 'text-[15px] leading-normal'
          "
        >
          {{ dek }}
        </p>
      </div>
    </div>
    <slot name="actions" />
  </header>
</template>
