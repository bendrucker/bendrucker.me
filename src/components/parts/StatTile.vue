<script setup lang="ts">
import { PART_ICONS, type PartIcon } from "./icons";

defineProps<{
  value: string;
  label: string;
  unit?: string;
  icon?: PartIcon;
}>();
</script>

<template>
  <span
    class="group/stat flex min-w-0 flex-col gap-0.5 rounded-xl tint-7 px-3 py-2.5"
  >
    <span
      class="inline-flex items-baseline gap-1 text-[17px] leading-tight font-bold tabular-nums"
    >
      <span
        v-if="icon"
        aria-hidden="true"
        class="size-[13px] flex-none self-center text-cat"
        :class="[
          PART_ICONS[icon],
          icon === 'star'
            ? 'group-hover/stat:animate-twinkle motion-reduce:group-hover/stat:animate-none'
            : '',
        ]"
      />
      {{ value }}
      <small v-if="unit" class="text-xs font-normal text-dim">{{ unit }}</small>
    </span>
    <span class="truncate text-[11px] text-dim">{{ label }}</span>
  </span>
</template>
