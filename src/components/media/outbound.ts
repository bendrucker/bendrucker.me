import { onBeforeUnmount, ref } from "vue";

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
 */
export function useOutbound() {
  const playing = ref("");
  let timers: number[] = [];

  function clear() {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  }

  function open(event: MouseEvent, key: string, url: string) {
    if (!plainClick(event)) return;
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

  onBeforeUnmount(clear);

  return { playing, open };
}
