<script setup lang="ts">
import {
  hstComponent,
  hstProps,
  type StoryControlSet,
  type StoryState,
} from "./controls";

const props = defineProps<{
  controls: StoryControlSet;
  state: StoryState;
}>();

/**
 * Histoire owns the state object and hands the same instance to the preview and
 * to the panel, so writing a key here is what `v-model="state.x"` does in a
 * hand-written slot: it drives the story, not this component's parent.
 */
function write(key: string, value: unknown) {
  // eslint-disable-next-line vue/no-mutating-props
  props.state[key] = value;
}
</script>

<template>
  <component
    :is="hstComponent(control)"
    v-for="(control, key) in controls"
    :key="key"
    :title="control.title"
    :model-value="state[key]"
    v-bind="hstProps(control)"
    @update:model-value="write(String(key), $event)"
  />
</template>
