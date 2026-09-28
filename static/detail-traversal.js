// Lets a list's detail modal answer Back and Forward before Astro's router
// does. The router listens for `popstate` on the window, and listeners on the
// event's target run in the order they were added, capture or not. An island
// hydrates after the router's module has run, so its own listener would always
// come second, after the router had already started swapping the page.
//
// This classic script runs while the head is parsed, ahead of every module,
// and hands each traversal to whichever list has claimed them. A list that
// owns the traversal stops it here, and the router never sees it.

addEventListener(
  "popstate",
  (event) => {
    const claim = window.detailTraversal;
    if (typeof claim === "function" && claim(event)) {
      event.stopImmediatePropagation();
    }
  },
  { capture: true },
);
