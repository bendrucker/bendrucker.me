/**
 * Whether an event landed on a video's own controls. A pointer on the scrubber
 * and an arrow key held over it both belong to the player, so the carousel's
 * drag and the lightbox's paging each leave them alone.
 */
export function withinVideo(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("video") !== null;
}
