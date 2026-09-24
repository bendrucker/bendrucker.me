import { onMounted, shallowRef, type ShallowRef } from "vue";
import { readerClock, serverClock, type Clock } from "../clock";

/**
 * The server's clock through hydration, then the reader's once mounted, so a
 * card's first client render repeats the text the Worker wrote.
 */
export function useClock(renderedAt: string): Readonly<ShallowRef<Clock>> {
  const clock = shallowRef(serverClock(renderedAt));
  onMounted(() => {
    clock.value = readerClock();
  });
  return clock;
}
