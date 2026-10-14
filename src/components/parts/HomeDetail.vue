<script setup lang="ts">
import { computed } from "vue";
import CodeDetail from "@/components/code/CodeDetail.vue";
import RideDetail from "@/components/rides/RideDetail.vue";
import { useDetailModal, type OpenDetail } from "@/detail/useDetailModal";
import {
  HOME_PARAM,
  fetchHomeDetail,
  homeFullHref,
  homeKey,
  type HomeDetail,
} from "@/home/detail";
import DetailModal from "./DetailModal.vue";

const props = defineProps<{
  /** The year a ride's date leaves unsaid. */
  thisYear: string;
  /** The item a shared link opened over the cards, when it named one. */
  open?: OpenDetail<HomeDetail> | null;
}>();

const { key, data, failed, close, restoreFocus } = useDetailModal(
  { param: HOME_PARAM, keyOf: homeKey, load: fetchHomeDetail },
  props.open ?? null,
);

const isRide = computed(() => key.value?.startsWith("ride/") ?? false);

const label = computed(() => {
  if (data.value?.kind === "ride") return data.value.ride.name;
  if (data.value?.kind === "code") return data.value.detail.title;
  return isRide.value ? "Ride" : "Repository";
});
</script>

<template>
  <!-- The modal takes its colors from the category of what it shows, since
       the home page itself belongs to none. -->
  <div :class="isRide ? 'cat-rides' : 'cat-code'">
    <DetailModal
      :open="key !== null"
      :label="label"
      :noun="isRide ? 'ride' : 'item'"
      :full-href="key === null ? undefined : homeFullHref(key)"
      close-href="/"
      :loading="data === null"
      :failed="failed"
      :hero="isRide"
      @close="close"
      @closed="restoreFocus"
    >
      <RideDetail
        v-if="data?.kind === 'ride'"
        :ride="data.ride"
        units="imperial"
        :this-year="thisYear"
        :level="2"
      />
      <CodeDetail
        v-else-if="data?.kind === 'code'"
        :detail="data.detail"
        :level="2"
      />
    </DetailModal>
  </div>
</template>
