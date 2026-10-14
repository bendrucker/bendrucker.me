// Whether a list route's desktop sidebar is collapsed. It lives on the root as
// `data-sidebar`, set before first paint so the layout never jumps, and in
// storage so it holds across routes and reloads. The toggle is plain markup
// that no island owns, so one listener on the document drives it everywhere.

const sidebarKey = "sidebar";

function readSidebar() {
  try {
    return localStorage.getItem(sidebarKey) === "collapsed";
  } catch {
    return false;
  }
}

let sidebarCollapsed = readSidebar();

function reflectSidebar(root) {
  if (sidebarCollapsed) root.setAttribute("data-sidebar", "collapsed");
  else root.removeAttribute("data-sidebar");
}

function syncSidebarToggles() {
  for (const toggle of document.querySelectorAll("[data-sidebar-toggle]")) {
    toggle.setAttribute("aria-expanded", String(!sidebarCollapsed));
    toggle.setAttribute(
      "title",
      sidebarCollapsed ? "Show sidebar" : "Hide sidebar",
    );
  }
}

reflectSidebar(document.documentElement);

document.addEventListener("click", (event) => {
  const toggle =
    event.target instanceof Element &&
    event.target.closest("[data-sidebar-toggle]");
  if (!toggle) return;
  sidebarCollapsed = !sidebarCollapsed;
  try {
    localStorage.setItem(sidebarKey, sidebarCollapsed ? "collapsed" : "open");
  } catch {
    // Without storage the choice lasts until the next full load.
  }
  reflectSidebar(document.documentElement);
  syncSidebarToggles();
});

// The router replaces the root's attributes with the fetched page's.
document.addEventListener("astro:before-swap", (event) => {
  reflectSidebar(event.newDocument.documentElement);
});
document.addEventListener("astro:after-swap", syncSidebarToggles);
document.addEventListener("DOMContentLoaded", syncSidebarToggles);
