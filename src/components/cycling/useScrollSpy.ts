import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";

/** A band across the upper third of the viewport. A section becomes active as
 * its top crosses into the band rather than when it first appears. */
const DEFAULT_ROOT_MARGIN = "-20% 0px -70% 0px";

/**
 * Tracks which `[data-month-key]` section is in view. Callers own the sections:
 * the composable finds them by attribute, so the rail and the sections stay
 * independent components.
 */
export function useScrollSpy(
  keys: Ref<string[]>,
  options: { rootMargin?: string } = {},
): Ref<string | null> {
  const activeKey = ref<string | null>(null);
  const sections = new Map<string, Element>();
  const intersecting = new Set<string>();
  let observer: IntersectionObserver | null = null;

  function selectActive() {
    // Positions are read live rather than taken from the entries, because an
    // entry only records where its section sat when its visibility changed.
    const measured = [...sections]
      .map(([key, element]) => ({
        key,
        top: element.getBoundingClientRect().top,
      }))
      .sort((a, b) => a.top - b.top);

    const visible = measured.find((section) => intersecting.has(section.key));
    if (visible) {
      activeKey.value = visible.key;
      return;
    }

    const passed = measured.filter((section) => section.top < 0).at(-1);
    activeKey.value = passed?.key ?? measured[0]?.key ?? null;
  }

  function observe() {
    if (typeof document === "undefined") return;

    observer?.disconnect();
    sections.clear();
    intersecting.clear();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.monthKey;
          if (!key) continue;
          if (entry.isIntersecting) intersecting.add(key);
          else intersecting.delete(key);
        }
        selectActive();
      },
      { rootMargin: options.rootMargin ?? DEFAULT_ROOT_MARGIN },
    );

    for (const key of keys.value) {
      const element = document.querySelector(`[data-month-key="${key}"]`);
      if (!element) continue;
      sections.set(key, element);
      observer.observe(element);
    }
  }

  onMounted(observe);

  watch(keys, observe, { flush: "post" });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return activeKey;
}
