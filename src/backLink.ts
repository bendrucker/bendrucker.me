// An item page's Back returns to wherever the reader opened it from: a list,
// the home page, or a modal over either. It steps back through history when
// the page before this one was on this site, and otherwise follows its link,
// which names the page's list.
import * as z from "zod/mini";
import { isPlainClick } from "@/detail/url";

/** The client router's index, which counts entries since the document loaded. */
const routerState = z.looseObject({ index: z.number() });

function arrivedFromSite(): boolean {
  const state = routerState.safeParse(history.state);
  if (state.success && state.data.index > 0) return true;
  if (document.referrer === "") return false;
  try {
    return new URL(document.referrer).origin === location.origin;
  } catch {
    return false;
  }
}

function onClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[data-back-link]");
  if (link === null || !isPlainClick(event) || !arrivedFromSite()) return;
  // Capture runs ahead of the router's own click listener.
  event.preventDefault();
  history.back();
}

document.addEventListener("click", onClick, { capture: true });
