<script setup lang="ts">
import { computed } from "vue";
import type { Language } from "./composables/useActivityApi";

const props = defineProps<{
  languages: Language[];
  selectedLanguage: string | null;
}>();

const total = computed(() =>
  props.languages.reduce((sum, l) => sum + l.count, 0)
);

const emit = defineEmits<{
  select: [language: string | null];
}>();

function langShort(lang: Language): string {
  if (!lang.extension) return lang.name.toLowerCase();
  return lang.extension.slice(1);
}

function hexLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const segments = computed(() =>
  props.languages.map((lang) => {
    const pct = total.value > 0 ? (lang.count / total.value) * 100 : 0;
    const textColor =
      hexLuminance(lang.color) > 0.6 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";
    return { ...lang, pct, textColor, short: langShort(lang) };
  })
);

function toggle(name: string) {
  emit("select", props.selectedLanguage === name ? null : name);
}
</script>

<template>
  <div v-if="languages.length > 0" class="flex h-6 rounded-full overflow-hidden">
    <button
      v-for="seg in segments"
      :key="seg.name"
      :class="[
        'h-full overflow-hidden flex items-center justify-center hover:opacity-80',
        selectedLanguage && selectedLanguage !== seg.name
          ? 'opacity-30'
          : '',
      ]"
      :style="{
        width: seg.pct.toFixed(1) + '%',
        backgroundColor: seg.color,
        transition: 'width 300ms ease, opacity 150ms ease',
      }"
      :aria-label="seg.name"
      :title="`${seg.name}: ${seg.count}`"
      @click="toggle(seg.name)"
    >
      <span
        v-if="seg.pct >= 5"
        class="text-[9px] font-medium truncate px-1 pointer-events-none"
        :style="{ color: seg.textColor }"
      >
        {{ seg.short }}
      </span>
    </button>
  </div>
</template>
