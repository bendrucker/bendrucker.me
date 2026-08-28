import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";

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
  const sections = new Map<Element, string>();
  const intersecting = new Set<Element>();
  let observer: IntersectionObserver | null = null;

  function selectActive() {
    // Positions are read live rather than taken from the entries, because an
    // entry only records where its section sat when its visibility changed.
    const measured = [...sections]
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

  function observe() {
    observer?.disconnect();
    sections.clear();
    intersecting.clear();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!sections.has(entry.target)) continue;
          if (entry.isIntersecting) intersecting.add(entry.target);
          else intersecting.delete(entry.target);
        }
        selectActive();
      },
      { rootMargin: options.rootMargin ?? DEFAULT_ROOT_MARGIN },
    );

    const wanted = new Set(keys.value);
    const scope = options.root?.value ?? document;
    for (const element of scope.querySelectorAll<HTMLElement>(
      "[data-month-key]",
    )) {
      const key = element.dataset.monthKey;
      if (!key || !wanted.has(key)) continue;
      sections.set(element, key);
      observer.observe(element);
    }
  }

  onMounted(() => {
    observe();
    // Resizing reflows the sections without crossing the band, so the observer
    // stays quiet while the active section moves out from under it.
    window.addEventListener("resize", selectActive);
  });

  // Watching content rather than identity, so a caller that mutates the array
  // in place is tracked and one that rebuilds an identical array is not.
  watch(() => keys.value.join("\n"), observe, { flush: "post" });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", selectActive);
    observer?.disconnect();
    observer = null;
  });

  return activeKey;
}
