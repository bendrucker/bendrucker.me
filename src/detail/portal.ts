// Where an overlay opened from inside the detail modal mounts. A native modal
// dialog sits in the top layer and makes everything outside it inert, so a
// viewer portaled to `body` would open beneath it and take no input. Inside
// the modal an overlay portals into the dialog instead, and everywhere else
// to `body`.
import { inject, type InjectionKey, type Ref } from "vue";

export const DETAIL_PORTAL: InjectionKey<Readonly<Ref<HTMLElement | null>>> =
  Symbol("detail-portal");

/** The open modal's dialog, or null outside one, where an overlay takes `body`. */
export function usePortalTarget(): Readonly<Ref<HTMLElement | null>> | null {
  return inject(DETAIL_PORTAL, null);
}
