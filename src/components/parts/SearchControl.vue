<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    /** What the route lists, for the placeholder: "Search rides". */
    noun: string;
    /** Starts as an icon button and opens into the field, for a phone's tool row. */
    collapsible?: boolean;
    /** The query parameter the field submits as. */
    name?: string;
    /** Announced politely as results change, like "4 rides". */
    status?: string;
  }>(),
  { collapsible: false, name: "q", status: "" },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const input = useTemplateRef<HTMLInputElement>("input");
const toggle = useTemplateRef<HTMLButtonElement>("toggle");

const open = ref(!props.collapsible || props.modelValue !== "");

watch(
  () => props.modelValue,
  (value) => {
    if (value !== "") open.value = true;
  },
);

async function show() {
  open.value = true;
  await nextTick();
  input.value?.focus();
}

async function hide() {
  emit("update:modelValue", "");
  open.value = false;
  await nextTick();
  toggle.value?.focus();
}

async function flip() {
  await (open.value ? hide() : show());
}

function write(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    emit("update:modelValue", event.target.value);
  }
}

async function clear() {
  emit("update:modelValue", "");
  await nextTick();
  input.value?.focus();
}

async function escape(event: KeyboardEvent) {
  if (props.modelValue !== "") {
    event.preventDefault();
    emit("update:modelValue", "");
  } else if (props.collapsible) {
    event.preventDefault();
    await hide();
  }
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5" :class="open ? 'flex-1' : ''">
    <label
      v-if="open"
      class="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-background px-3 transition-[border-color,box-shadow] duration-200 focus-within:border-[color-mix(in_srgb,var(--cat)_60%,var(--line))] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cat)_16%,transparent)]"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--search] size-3.5 flex-none text-dim"
      />
      <input
        ref="input"
        type="search"
        :name="name"
        :value="modelValue"
        :placeholder="`Search ${noun}`"
        :aria-label="`Search ${noun}`"
        autocomplete="off"
        enterkeyhint="search"
        class="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-dim md:text-sm [&::-webkit-search-cancel-button]:hidden"
        @input="write"
        @keydown.esc="escape"
      />
      <button
        v-if="modelValue !== ''"
        type="button"
        aria-label="Clear search"
        class="-mr-1.5 inline-flex size-7 flex-none items-center justify-center rounded-md text-dim hover:bg-hover hover:text-foreground"
        @click="clear"
      >
        <span aria-hidden="true" class="icon-[lucide--x] size-3.5" />
      </button>
    </label>
    <button
      v-if="collapsible"
      ref="toggle"
      type="button"
      :aria-expanded="open"
      :aria-label="open ? 'Close search' : `Search ${noun}`"
      :title="open ? 'Close search' : `Search ${noun}`"
      class="inline-flex size-10 flex-none items-center justify-center rounded-[10px] text-dim transition-colors hover:bg-hover hover:text-foreground aria-expanded:tint-16 aria-expanded:text-cat"
      @click="flip"
    >
      <span
        aria-hidden="true"
        class="size-4"
        :class="open ? 'icon-[lucide--x]' : 'icon-[lucide--search]'"
      />
    </button>
    <span class="sr-only" role="status" aria-live="polite">{{ status }}</span>
  </div>
</template>
