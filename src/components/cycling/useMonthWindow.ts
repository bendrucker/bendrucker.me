import { defaultDocument, tryOnScopeDispose } from "@vueuse/core";
import { ref, type Ref } from "vue";
import { observeSections, useMonthSections } from "./monthSections";

/**
 * How far past the viewport a month keeps its rides, as a multiple of the
 * viewport. Wide enough that scrolling at a normal pace never waits on a
 * month to come back, narrow enough that a log scrolled to its first ride
 * holds a few dozen cards rather than a few thousand.
 */
const DEFAULT_MARGIN = 2;

export interface MonthWindow {
  /** Whether a month's rides belong in the DOM. */
  holds: (key: string) => boolean;
  /** The height the month stood at when it last held them. */
  reserved: (key: string) => number;
}

/**
 * Keeps only the months near the viewport mounted.
 *
 * The log grows to every ride ever recorded, and a ride card costs about
 * thirty elements and a decoded basemap the browser holds for as long as the
 * image is in the document. Left whole, a log scrolled to its beginning runs
 * to six figures of elements and a gigabyte of bitmaps.
 *
 * A month that leaves the window is measured on its way out, and its section
 * reserves that height until the rides come back. Nothing above the viewport
 * changes size, so the reader keeps their place.
 */
export function useMonthWindow(
  keys: Ref<string[]>,
  options: { root?: Ref<HTMLElement | null>; margin?: number } = {},
): MonthWindow {
  // Held by exception: a month is mounted until the observer has placed it
  // outside the window. A month that started out unmounted would reserve no
  // height, and the collapsed page would leave the loading sentinel on screen
  // and pull every remaining page at once.
  const far = ref(new Set<string>());
  const heights = new Map<string, number>();

  const sections = useMonthSections(keys, options.root);

  const observer = defaultDocument
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!(entry.target instanceof HTMLElement)) continue;
            const key = sections.value.get(entry.target);
            if (key === undefined) continue;
            if (entry.isIntersecting) {
              far.value.delete(key);
              continue;
            }
            // A hidden log reports every section at zero, which says nothing
            // about where a month sits. A month never measured would drop its
            // rides and reserve nothing in their place.
            if (entry.boundingClientRect.height === 0) continue;

            // The rect the observer already measured, taken while the month
            // still holds its rides. Reading it back off the element would
            // force a layout and, a tick later, measure a section already
            // emptied.
            heights.set(key, entry.boundingClientRect.height);
            far.value.add(key);
          }
        },
        { rootMargin: `${(options.margin ?? DEFAULT_MARGIN) * 100}%` },
      )
    : null;

  tryOnScopeDispose(() => observer?.disconnect());

  observeSections(sections, {
    enter: (element) => observer?.observe(element),
    leave: (element, key) => {
      observer?.unobserve(element);
      far.value.delete(key);
      heights.delete(key);
    },
  });

  return {
    holds: (key) => !far.value.has(key),
    reserved: (key) => heights.get(key) ?? 0,
  };
}
