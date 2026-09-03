<script setup lang="ts">
import { computed, ref } from "vue";
import {
  HoverCardRoot,
  HoverCardTrigger,
  HoverCardPortal,
  HoverCardContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from "reka-ui";
import type { Language } from "@/activity/types";
import { desaturateColor, pickLabelColor } from "./language-colors";

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

function stripedGradient(languages: typeof overflowLangs.value): string {
  const stripeWidth = 3;
  const stops: string[] = [];
  let offset = 0;
  for (const lang of languages) {
    const color = desaturateColor(lang.color, 0.6);
    stops.push(`${color} ${offset}px`, `${color} ${offset + stripeWidth}px`);
    offset += stripeWidth;
  }
  return `repeating-linear-gradient(135deg, ${stops.join(", ")})`;
}

type Segment = Language & { pct: number; textColor: string; short: string };

const segments = computed<Segment[]>(() =>
  props.languages.map((lang) => {
    const pct = total.value > 0 ? (lang.count / total.value) * 100 : 0;
    const textColor = pickLabelColor(lang.color);
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
    <TooltipProvider :delay-duration="200">
      <div class="flex h-6 overflow-hidden rounded-full">
        <TooltipRoot v-for="seg in primarySegments" :key="seg.name">
          <TooltipTrigger as-child>
            <button
              :class="[
                'flex h-full items-center justify-center overflow-hidden hover:opacity-80',
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
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground shadow-lg"
            >
              {{ seg.name }}: {{ seg.count }}
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>

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
    </TooltipProvider>

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
