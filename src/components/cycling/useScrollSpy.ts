import {
  defaultDocument,
  useEventListener,
  useIntersectionObserver,
  useResizeObserver,
} from "@vueuse/core";
import { computed, ref, watch, type Ref } from "vue";

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
  section.scrollIntoView({ block: "start" });
  section.focus({ preventScroll: true });
}

/**
 * Tracks which `[data-month-key]` section is in view. Callers own the sections:
 * the composable finds them by attribute, so the rail and the sections stay
 * independent components. Pass `root` when more than one spy shares a page,
 * since an unscoped search would find the other instance's sections first.
 */
export function useScrollSpy(
  keys: Ref<string[]>,
  options: { rootMargin?: string; root?: Ref<HTMLElement | null> } = {},
): Ref<string | null> {
  const activeKey = ref<string | null>(null);
  const intersecting = new Set<HTMLElement>();

  // Recomputed whenever `keys` or the root changes, by identity. A caller that
  // rebuilds the array with the same contents rebuilds the observers too.
  const sections = computed(() => {
    const wanted = new Set(keys.value);
    // `defaultDocument` is `undefined` on the server. The watcher below reads
    // this computed eagerly, so a bare `document` would throw during SSR.
    const scope = options.root?.value ?? defaultDocument;
    const map = new Map<HTMLElement, string>();
    if (!scope) return map;
    for (const element of scope.querySelectorAll<HTMLElement>(
      "[data-month-key]",
    )) {
      const key = element.dataset.monthKey;
      if (!key || !wanted.has(key)) continue;
      map.set(element, key);
    }
    return map;
  });
  const sectionElements = () => [...sections.value.keys()];

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

  // A section dropped from `keys` should stop counting as intersecting, even
  // though the observer that reported it has already been replaced. Flushed
  // post-render so this reads `sections` no earlier than the DOM-scoped
  // watchers below do, since a computed caches whichever DOM state it was
  // first read against.
  watch(
    sections,
    (current) => {
      for (const element of intersecting) {
        if (!current.has(element)) intersecting.delete(element);
      }
    },
    { flush: "post" },
  );

  useIntersectionObserver(
    sectionElements,
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
  );

  // Resizing reflows the sections without crossing the band, so the observer
  // stays quiet while the active section moves out from under it.
  useEventListener("resize", selectActive);

  // A section can also reflow on its own: an image finishing load, a section
  // expanding, a font swapping in. None of those cross a window resize.
  useResizeObserver(sectionElements, selectActive);

  return activeKey;
}
