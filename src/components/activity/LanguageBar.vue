<script setup lang="ts">
import { computed, ref } from "vue";
import type { Language } from "./composables/useActivityApi";

const OVERFLOW_THRESHOLD = 2;

const props = defineProps<{
  languages: Language[];
  selectedLanguage: string | null;
}>();

const total = computed(() =>
  props.languages.reduce((sum, l) => sum + l.count, 0),
);

const emit = defineEmits<{
  select: [language: string | null];
}>();

const showChips = ref(false);
const tooltipVisible = ref(false);

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

function desaturate(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const mix = (ch: number) =>
    Math.round(ch + (gray - ch) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function stripedGradient(languages: typeof overflowLangs.value): string {
  const stripeWidth = 3;
  const stops: string[] = [];
  let offset = 0;
  for (const lang of languages) {
    const color = desaturate(lang.color, 0.6);
    stops.push(`${color} ${offset}px`, `${color} ${offset + stripeWidth}px`);
    offset += stripeWidth;
  }
  return `repeating-linear-gradient(135deg, ${stops.join(", ")})`;
}

type Segment = Language & { pct: number; textColor: string; short: string };

const segments = computed<Segment[]>(() =>
  props.languages.map((lang) => {
    const pct = total.value > 0 ? (lang.count / total.value) * 100 : 0;
    const textColor =
      hexLuminance(lang.color) > 0.6
        ? "rgba(0,0,0,0.6)"
        : "rgba(255,255,255,0.8)";
    return { ...lang, pct, textColor, short: langShort(lang) };
  }),
);

const primarySegments = computed(() =>
  segments.value.filter((s) => s.pct >= OVERFLOW_THRESHOLD),
);

const overflowLangs = computed(() =>
  segments.value.filter((s) => s.pct < OVERFLOW_THRESHOLD),
);

const overflowPct = computed(() =>
  overflowLangs.value.reduce((sum, s) => sum + s.pct, 0),
);

const overflowGradient = computed(() =>
  overflowLangs.value.length > 0 ? stripedGradient(overflowLangs.value) : "",
);

const isOverflowSelected = computed(() =>
  overflowLangs.value.some((l) => l.name === props.selectedLanguage),
);

function toggle(name: string) {
  emit("select", props.selectedLanguage === name ? null : name);
}

function toggleChips() {
  showChips.value = !showChips.value;
}
</script>

<template>
  <div v-if="languages.length > 0" class="relative">
    <div class="flex h-6 rounded-full overflow-hidden">
      <button
        v-for="seg in primarySegments"
        :key="seg.name"
        :class="[
          'h-full overflow-hidden flex items-center justify-center hover:opacity-80',
          selectedLanguage && selectedLanguage !== seg.name ? 'opacity-30' : '',
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

      <button
        v-if="overflowLangs.length > 0"
        :class="[
          'h-full overflow-hidden flex items-center justify-center hover:opacity-80',
          selectedLanguage && !isOverflowSelected ? 'opacity-30' : '',
        ]"
        :style="{
          width: overflowPct.toFixed(1) + '%',
          backgroundImage: overflowGradient,
          transition: 'width 300ms ease, opacity 150ms ease',
        }"
        aria-label="Other languages"
        :title="`Other: ${overflowLangs.length} languages`"
        @mouseenter="tooltipVisible = true"
        @mouseleave="tooltipVisible = false"
        @click="toggleChips()"
      >
        <span
          v-if="overflowPct >= 5"
          class="text-[9px] font-medium truncate px-1 pointer-events-none text-foreground/60"
        >
          ...
        </span>
      </button>
    </div>

    <div
      v-if="tooltipVisible && overflowLangs.length > 0"
      class="absolute bottom-full mb-2 right-0 bg-background border border-border rounded-lg shadow-lg p-2 z-10 pointer-events-none"
    >
      <div
        v-for="lang in overflowLangs"
        :key="lang.name"
        class="flex items-center gap-2 text-xs whitespace-nowrap py-0.5"
      >
        <span
          class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: lang.color }"
        />
        <span class="text-foreground">{{ lang.name }}</span>
        <span class="text-muted ml-auto pl-3">{{ lang.count }}</span>
      </div>
    </div>

    <div v-if="showChips" class="flex flex-wrap gap-1.5 mt-2">
      <button
        v-for="lang in overflowLangs"
        :key="lang.name"
        :class="[
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border hover:opacity-80',
          selectedLanguage && selectedLanguage !== lang.name
            ? 'opacity-30'
            : '',
        ]"
        :style="{ transition: 'opacity 150ms ease' }"
        @click="toggle(lang.name)"
      >
        <span
          class="inline-block w-2 h-2 rounded-full"
          :style="{ backgroundColor: lang.color }"
        />
        {{ lang.short }}
        <span class="text-muted">{{ lang.count }}</span>
      </button>
    </div>
  </div>
</template>
