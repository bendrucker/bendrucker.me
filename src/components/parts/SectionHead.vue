<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    /** Indents the label past the timeline gutter, so it sits over the rows. */
    gutter?: boolean;
    /** The heading level, which depends on what the page puts above the list. */
    level?: 2 | 3;
  }>(),
  { gutter: true, level: 2 },
);
</script>

<template>
  <component
    :is="`h${level}`"
    class="pt-5 pb-2 label-caps md:first:pt-1"
    :class="gutter ? 'pl-[34px]' : 'pl-1'"
  >
    {{ label }}
  </component>
</template>
