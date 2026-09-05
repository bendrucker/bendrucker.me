import { defaultDocument } from "@vueuse/core";
import { computed, watch, type ComputedRef, type Ref } from "vue";

/**
 * The log's month sections, keyed to the month each one holds.
 *
 * Sections are found by attribute rather than passed in, so the spy and the
 * window can both track them without the view wiring either one to a list of
 * elements. Pass `root` when more than one log shares a page, since an
 * unscoped search would find the other instance's sections first.
 */
export function useMonthSections(
  keys: Ref<string[]>,
  root?: Ref<HTMLElement | null>,
): ComputedRef<Map<HTMLElement, string>> {
  return computed(() => {
    const wanted = new Set(keys.value);
    // `defaultDocument` is `undefined` on the server, where there is no DOM to
    // search and nothing observing one.
    const scope = root?.value ?? defaultDocument;
    const sections = new Map<HTMLElement, string>();
    if (!scope) return sections;

    for (const element of scope.querySelectorAll<HTMLElement>(
      "[data-month-key]",
    )) {
      const key = element.dataset.monthKey;
      if (!key || !wanted.has(key)) continue;
      sections.set(element, key);
    }
    return sections;
  });
}

/**
 * Reconciles a caller's observers against the sections, so a page landing
 * costs one `observe` per month it added rather than a teardown and rebuild
 * across every month already there. The log grows to a hundred and fifty
 * months over twenty-odd pages, which is the difference between linear and
 * quadratic.
 *
 * Flushed post-render so the sections are read no earlier than the DOM
 * reflects them, and run once on setup to pick up the months the server
 * rendered.
 */
export function observeSections(
  sections: ComputedRef<Map<HTMLElement, string>>,
  handlers: {
    enter: (element: HTMLElement, key: string) => void;
    leave: (element: HTMLElement, key: string) => void;
  },
): void {
  const observed = new Map<HTMLElement, string>();

  watch(
    sections,
    (current) => {
      for (const [element, key] of observed) {
        if (current.has(element)) continue;
        observed.delete(element);
        handlers.leave(element, key);
      }
      for (const [element, key] of current) {
        if (observed.has(element)) continue;
        observed.set(element, key);
        handlers.enter(element, key);
      }
    },
    { flush: "post", immediate: true },
  );
}
