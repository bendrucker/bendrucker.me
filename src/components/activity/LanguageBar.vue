<script setup lang="ts">
import { computed, ref } from "vue";
import {
  HoverCardRoot,
  HoverCardTrigger,
  HoverCardPortal,
  HoverCardContent,
} from "reka-ui";
import type { Language } from "@/activity/types";

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

const manualChips = ref(false);

const chipsVisible = computed(
  () => manualChips.value || props.selectedLanguage !== null,
);

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
  manualChips.value = !manualChips.value;
}
</script>

<template>
  <div v-if="languages.length > 0">
    <div class="flex h-6 overflow-hidden rounded-full">
      <button
        v-for="seg in primarySegments"
        :key="seg.name"
        :class="[
          'flex h-full items-center justify-center overflow-hidden hover:opacity-80',
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
          class="pointer-events-none truncate px-1 text-[9px] font-medium"
          :style="{ color: seg.textColor }"
        >
          {{ seg.short }}
        </span>
      </button>

      <HoverCardRoot
        v-if="overflowLangs.length > 0"
        :open-delay="200"
        :close-delay="300"
      >
        <HoverCardTrigger as-child>
          <button
            :class="[
              'flex h-full items-center justify-center overflow-hidden hover:opacity-80',
              selectedLanguage && !isOverflowSelected ? 'opacity-30' : '',
            ]"
            :style="{
              width: overflowPct.toFixed(1) + '%',
              backgroundImage: overflowGradient,
              transition: 'width 300ms ease, opacity 150ms ease',
            }"
            aria-label="Other languages"
            @click="toggleChips()"
          >
            <span
              v-if="overflowPct >= 5"
              class="pointer-events-none truncate px-1 text-[9px] font-medium text-foreground/60"
            >
              ...
            </span>
          </button>
        </HoverCardTrigger>

        <HoverCardPortal>
          <HoverCardContent
            side="top"
            align="end"
            :side-offset="4"
            class="z-10 rounded-lg border border-border bg-background p-1 shadow-lg"
          >
            <button
              v-for="lang in overflowLangs.slice(0, 8)"
              :key="lang.name"
              class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs whitespace-nowrap hover:bg-muted/20"
              @click="toggle(lang.name)"
            >
              <span
                class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: lang.color }"
              />
              <span class="text-foreground">{{ lang.name }}</span>
              <span class="ml-auto pl-3 text-muted">{{ lang.count }}</span>
            </button>
            <div
              v-if="overflowLangs.length > 8"
              class="px-1.5 py-0.5 text-xs text-muted"
            >
              +{{ overflowLangs.length - 8 }} more
            </div>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCardRoot>
    </div>

    <div
      class="grid transition-[grid-template-rows] duration-300 ease-in-out"
      :class="chipsVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <div class="flex flex-wrap gap-1.5 pt-2">
          <button
            v-for="seg in segments"
            :key="seg.name"
            :class="[
              'inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:opacity-80',
              selectedLanguage && selectedLanguage !== seg.name
                ? 'opacity-30'
                : '',
            ]"
            :style="{ transition: 'opacity 150ms ease' }"
            @click="toggle(seg.name)"
          >
            <span
              class="inline-block h-2 w-2 rounded-full"
              :style="{ backgroundColor: seg.color }"
            />
            {{ seg.short }}
            <span class="text-muted">{{ seg.count }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
