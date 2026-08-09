import "./styles/global.css";

// Histoire toggles dark mode with a class on the preview's root element. The
// site keys off `data-theme`, so mirror one onto the other. Stories then pick
// up production's own light/dark treatment.
const HISTOIRE_DARK_CLASS = "htw-dark";

function syncTheme() {
  const root = document.documentElement;
  root.dataset.theme = root.classList.contains(HISTOIRE_DARK_CLASS)
    ? "dark"
    : "light";
}

syncTheme();

new MutationObserver(syncTheme).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});
