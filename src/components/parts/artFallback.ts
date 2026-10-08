import type { Directive } from "vue";

function hide(img: HTMLImageElement) {
  img.style.visibility = "hidden";
}

function show(img: HTMLImageElement) {
  img.style.visibility = "";
}

/**
 * Hides a poster or sleeve that fails to load, so the tile behind it shows
 * rather than the browser's broken-image glyph. An image that failed before
 * the island hydrated is caught on mount, and a later successful load, as
 * when the element is reused for another row, shows it again.
 */
export const vArtFallback: Directive<HTMLImageElement> = {
  mounted(img) {
    img.addEventListener("error", () => {
      hide(img);
    });
    img.addEventListener("load", () => {
      show(img);
    });
    if (img.complete && img.naturalWidth === 0) hide(img);
  },
};
