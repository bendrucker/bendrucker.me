import {
  defaultDocument,
  tryOnScopeDispose,
  useEventListener,
} from "@vueuse/core";
import { ref, type Ref } from "vue";
import { observeSections, useMonthSections } from "./monthSections";

/** A band across the upper third of the viewport. A section becomes active once
 * its top reaches the band rather than when it first appears. */
const DEFAULT_ROOT_MARGIN = "-20% 0px -70% 0px";

/** Matches the bottom edge of the band above, as a fraction of the viewport. */
const BAND_BOTTOM = 0.3;

/**
 * Moves to the section a rail button names. Focus follows the scroll, since
 * scrolling alone leaves the keyboard and the screen reader cursor on the rail,
 * making the jump imperceptible to anything but a sighted pointer. The section
 * needs `tabindex="-1"` to accept it.
 */
export function scrollToSection(root: HTMLElement | null, key: string): void {
  const section = (root ?? document).querySelector(`[data-month-key="${key}"]`);
  if (!(section instanceof HTMLElement)) return;
  // Instant against the page's `scroll-smooth`, which would otherwise animate
  // across every month between here and the target. Each one they pass through
  // enters the window, mounts its rides, and leaves again, so a jump to the
  // first ride does the whole archive's DOM work on the way.
  section.scrollIntoView({ block: "start", behavior: "instant" });
  section.focus({ preventScroll: true });
}

/**
 * Tracks which month section is in view. Callers own the sections, so the rail
 * and the sections stay independent components. Pass `root` when more than one
 * spy shares a page.
 */
export function useScrollSpy(
  keys: Ref<string[]>,
  options: { rootMargin?: string; root?: Ref<HTMLElement | null> } = {},
): Ref<string | null> {
  const activeKey = ref<string | null>(null);
  const intersecting = new Set<HTMLElement>();

  const sections = useMonthSections(keys, options.root);

  function selectActive() {
    // Positions are read live rather than taken from the entries, because an
    // entry only records where its section sat when its visibility changed.
    const measured = [...sections.value]
      .map(([element, key]) => ({
        element,
        key,
        top: element.getBoundingClientRect().top,
      }))
      .toSorted((a, b) => a.top - b.top);

    const visible = measured.findLast((section) =>
      intersecting.has(section.element),
    );
    if (visible) {
      activeKey.value = visible.key;
      return;
    }

    // At the foot of the page a short trailing section never reaches the band,
    // so anything that started above the band still counts as passed.
    const bandBottom = window.innerHeight * BAND_BOTTOM;
    const passed = measured.findLast((section) => section.top < bandBottom);
    activeKey.value = passed?.key ?? measured[0]?.key ?? null;
  }

  const band = defaultDocument
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!(entry.target instanceof HTMLElement)) continue;
            if (!sections.value.has(entry.target)) continue;
            if (entry.isIntersecting) intersecting.add(entry.target);
            else intersecting.delete(entry.target);
          }
          selectActive();
        },
        { rootMargin: options.rootMargin ?? DEFAULT_ROOT_MARGIN },
      )
    : null;

  // A section can also reflow on its own: an image finishing load, a section
  // expanding, a font swapping in. None of those cross a window resize.
  const reflow = defaultDocument ? new ResizeObserver(selectActive) : null;

  tryOnScopeDispose(() => {
    band?.disconnect();
    reflow?.disconnect();
  });

  observeSections(sections, {
    enter: (element) => {
      band?.observe(element);
      reflow?.observe(element);
    },
    leave: (element) => {
      band?.unobserve(element);
      reflow?.unobserve(element);
      // A section dropped from `keys` should stop counting as intersecting,
      // even though the observer that reported it has stopped watching it.
      intersecting.delete(element);
    },
  });

  // Resizing reflows the sections without crossing the band, so the observer
  // stays quiet while the active section moves out from under it.
  useEventListener("resize", selectActive);

  return activeKey;
}
