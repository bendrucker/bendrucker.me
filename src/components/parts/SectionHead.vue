<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    /** Indents the label past the timeline gutter, so it sits over the rows. */
    gutter?: boolean;
    /** The heading level, which depends on what the page puts above the list. */
    level?: 2 | 3;
    /**
     * A page section, like Highlights or Recent, rather than a month or season
     * within one. It reads as a title and always sits at the list's edge.
     */
    section?: boolean;
  }>(),
  { gutter: true, level: 2, section: false },
);
</script>

<template>
  <component
    :is="`h${level}`"
    v-if="section"
    class="pt-3 pb-1 pl-1 text-lg leading-tight font-semibold text-foreground md:pt-1"
  >
    {{ label }}
  </component>
  <component
    :is="`h${level}`"
    v-else
    class="pt-5 pb-2 label-caps md:first:pt-1"
    :class="gutter ? 'pl-[34px]' : 'pl-1'"
  >
    {{ label }}
  </component>
</template>
