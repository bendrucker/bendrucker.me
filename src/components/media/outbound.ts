import { onBeforeUnmount, onMounted, ref } from "vue";

/** How long a tapped poster or record holds its motion before the link opens. */
const LEAD_MS = 450;
/** When the art slides back once its link has opened. */
const HOLD_MS = 1400;

function plainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * A shelf's art plays its motion before it leaves the site: a record slides
 * out of its sleeve, a poster lifts. A plain tap marks the item `out`, then
 * opens its link in a new tab once the motion has had its moment. A modified
 * click, and any reader who prefers reduced motion, gets the link at once.
 *
 * A touch screen has no hover to say where a tap will go, so its first tap
 * only arms the item, which names it and shows the outbound mark, and a
 * second tap on it leaves. A keyboard's Enter has a click `detail` of zero
 * and leaves at once.
 */
export function useOutbound() {
  const playing = ref("");
  const armed = ref("");
  let timers: number[] = [];

  function clear() {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  }

  function open(event: MouseEvent, key: string, url: string) {
    if (!plainClick(event)) return;

    const touch = event.detail > 0 && matchMedia("(pointer: coarse)").matches;
    if (touch && armed.value !== key) {
      event.preventDefault();
      armed.value = key;
      return;
    }
    armed.value = "";

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    event.preventDefault();
    clear();
    playing.value = key;
    timers.push(
      window.setTimeout(() => {
        const tab = window.open(url, "_blank");
        if (tab) tab.opener = null;
        else location.assign(url);
      }, LEAD_MS),
      window.setTimeout(() => {
        playing.value = "";
      }, HOLD_MS),
    );
  }

  /** A tap anywhere but an armed item's link disarms it. */
  function disarm(event: PointerEvent) {
    if (armed.value === "") return;
    const link =
      event.target instanceof Element ? event.target.closest("a") : null;
    if (link?.dataset.key !== armed.value) armed.value = "";
  }

  onMounted(() => {
    document.addEventListener("pointerdown", disarm);
  });

  onBeforeUnmount(() => {
    clear();
    document.removeEventListener("pointerdown", disarm);
  });

  return { playing, armed, open };
}

/** The link's state for the shelf's CSS: leaving, armed, or neither. */
export function linkState(
  key: string,
  playing: string,
  armed: string,
): "out" | "armed" | undefined {
  if (playing === key) return "out";
  if (armed === key) return "armed";
  return undefined;
}
