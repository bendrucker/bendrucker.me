<script setup lang="ts">
defineProps<{ href: string }>();
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center hover:opacity-75"
  >
    <svg
      class="h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="#FC4C02"
      aria-hidden="true"
    >
      <path
        d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"
      />
    </svg>
    <span class="sr-only">View on Strava</span>
  </a>
</template>
