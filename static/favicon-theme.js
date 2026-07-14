// Safari ignores prefers-color-scheme inside a linked SVG favicon, so the tab
// icon can't invert on its own. Swap it to a pre-colored variant when the OS
// color scheme changes. The tab bar follows the OS, not the site's theme
// toggle, so this tracks the media query rather than data-theme.
const scheme = window.matchMedia("(prefers-color-scheme: dark)");

function reflectFavicon() {
  document
    .querySelector("link[rel='icon'][type='image/svg+xml']")
    ?.setAttribute(
      "href",
      scheme.matches ? "/favicon-dark.svg" : "/favicon.svg",
    );
}

reflectFavicon();
scheme.addEventListener("change", reflectFavicon);
document.addEventListener("astro:after-swap", reflectFavicon);
