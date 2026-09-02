<script setup lang="ts">
import type { RidePhoto } from "@/activity/types";

defineProps<{ photos: RidePhoto[] }>();

defineEmits<{ open: [index: number] }>();
</script>

<template>
  <ul v-if="photos.length > 0" class="flex flex-wrap gap-1.5">
    <li v-for="(photo, index) in photos" :key="photo.id">
      <button
        type="button"
        class="block cursor-zoom-in"
        @click="$emit('open', index)"
      >
        <img
          :src="photo.thumbnailUrl"
          alt=""
          aria-hidden="true"
          loading="lazy"
          width="48"
          height="48"
          class="size-12 rounded border border-border object-cover"
        />
        <span class="sr-only">
          Open photo {{ index + 1 }} of {{ photos.length }}: {{ photo.alt }}
        </span>
      </button>
    </li>
  </ul>
</template>
