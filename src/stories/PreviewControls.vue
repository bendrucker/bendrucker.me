<script setup lang="ts">
import {
  selectEntries,
  type StoryControlSet,
  type StoryState,
} from "./controls";

const props = defineProps<{
  controls: StoryControlSet;
  state: StoryState;
}>();

/**
 * The story renders in an iframe the app sizes to a stored responsive width,
 * defaulting to 720px with no way to change it below the 640px viewport where
 * Histoire drops its toolbar. Escaping to this same document at the top level
 * is the only way a phone sees the story at the phone's own width.
 */
const framed = window.top !== window.self;
const href = window.location.href;

/**
 * Histoire owns the state object and hands the same instance to the preview and
 * to the panel, so writing a key here is what `v-model="state.x"` does in a
 * hand-written slot: it drives the story, not this component's parent.
 */
function set(key: string, value: unknown) {
  // eslint-disable-next-line vue/no-mutating-props
  props.state[key] = value;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function number(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
</script>

<template>
  <!-- Capped and left-aligned because a single-layout preview is sized to the
       stored responsive width, which on a phone is wider than the viewport.
       Anything past 300px sits off the right edge with no way to scroll to it,
       300 being what a 390px phone leaves once Histoire's preview padding and
       the story's own gutters are taken out. -->
  <div
    class="mb-4 max-w-[300px] rounded-md border border-dashed border-border/70 p-3 text-[11px] text-foreground/80"
  >
    <p class="mb-2 flex items-center gap-3 text-foreground/50 uppercase">
      story controls
      <a
        v-if="framed"
        :href="href"
        target="_top"
        class="text-accent normal-case underline"
      >
        full width
      </a>
    </p>

    <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
      <template v-for="(control, key) in controls" :key="key">
        <label :for="`control-${key}`" class="text-foreground/60">
          {{ control.title }}
        </label>

        <select
          v-if="control.type === 'select'"
          :id="`control-${key}`"
          :value="text(state[key])"
          class="w-full rounded border border-border bg-background px-2 py-1"
          @change="set(key, ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="entry in selectEntries(control.options)"
            :key="entry.value"
            :value="entry.value"
          >
            {{ entry.label }}
          </option>
        </select>

        <span
          v-else-if="control.type === 'slider'"
          class="flex items-center gap-2"
        >
          <input
            :id="`control-${key}`"
            type="range"
            class="w-full accent-accent"
            :min="control.min"
            :max="control.max"
            :step="control.step ?? 1"
            :value="number(state[key])"
            @input="set(key, Number(($event.target as HTMLInputElement).value))"
          />
          <output class="w-10 shrink-0 text-right tabular-nums">
            {{ number(state[key]) }}
          </output>
        </span>

        <input
          v-else-if="control.type === 'checkbox'"
          :id="`control-${key}`"
          type="checkbox"
          class="size-4 justify-self-start accent-accent"
          :checked="Boolean(state[key])"
          @change="set(key, ($event.target as HTMLInputElement).checked)"
        />

        <input
          v-else
          :id="`control-${key}`"
          type="text"
          class="w-full rounded border border-border bg-background px-2 py-1"
          :value="text(state[key])"
          @input="set(key, ($event.target as HTMLInputElement).value)"
        />
      </template>
    </div>
  </div>
</template>
