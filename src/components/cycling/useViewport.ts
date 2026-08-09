import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComputedRef,
  type Ref,
} from "vue";

const MOBILE_BREAKPOINT = 640;

/** The server has no viewport, and a mobile default would flash the wrong
 * layout between the server render and the first client measurement. */
const SERVER_WIDTH = 1280;

export function useViewport(): {
  width: Ref<number>;
  isMobile: ComputedRef<boolean>;
} {
  const width = ref(SERVER_WIDTH);
  const isMobile = computed(() => width.value < MOBILE_BREAKPOINT);

  function measure() {
    width.value = window.innerWidth;
  }

  onMounted(() => {
    measure();
    window.addEventListener("resize", measure, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", measure);
  });

  return { width, isMobile };
}
