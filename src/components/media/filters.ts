import { reactive, watch } from "vue";
import { category } from "@/categories";
import type { MediaCategory } from "@/media/types";
import { searchWithFilters, type MediaFilters } from "@/media/view";

/*
 * A media route's controls and its list are separate islands: the controls sit
 * in the phone's tool row and the desktop's sidebar, the list in the page's
 * body. Islands on one page share this module, and so this state, which each
 * seeds from the same server-rendered props so hydration agrees.
 *
 * Only the browser keeps it. A worker serves many requests from one module
 * instance, so the server builds fresh state for every island it renders.
 */

export interface MediaState extends MediaFilters {
  /** How many rows match. The list keeps it, and the search announces it. */
  count: number;
  /** The list's desktop sections, which the sidebar's rail names. */
  sections: string[];
}

const stores = new Map<MediaCategory, MediaState>();

if (typeof document !== "undefined") {
  // The client router keeps this module across pages. A page it swaps in
  // seeds its own state from its own URL.
  document.addEventListener("astro:before-swap", () => {
    stores.clear();
  });
}

/** The route's search and filters, kept in the URL so they can be shared. */
export function useMediaFilters(
  id: MediaCategory,
  initial: MediaState,
): MediaState {
  if (typeof window === "undefined") return reactive({ ...initial });

  const existing = stores.get(id);
  if (existing) return existing;

  const state = reactive({ ...initial });
  stores.set(id, state);

  const types = category(id).types ?? [];
  watch(
    () => ({ q: state.q, type: state.type, active: state.active }),
    (next) => {
      const search = searchWithFilters(location.search, types, next);
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${search}${location.hash}`,
      );
    },
  );
  return state;
}
