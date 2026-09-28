import { describe, expect, it } from "vitest";
import {
  closeStep,
  isPlainClick,
  linkKey,
  openKey,
  openStep,
  ownsTraversal,
  withOpenKey,
} from "./url";

const ORIGIN = "https://bendrucker.me";

describe("openKey", () => {
  it("reads the item the parameter names", () => {
    expect(openKey("?view=records&ride=abc", "ride")).toBe("abc");
  });

  it("is null without the parameter, or with it empty", () => {
    expect(openKey("?view=records", "ride")).toBeNull();
    expect(openKey("?ride=", "ride")).toBeNull();
  });
});

describe("withOpenKey", () => {
  it("adds the item after the list's own parameters", () => {
    expect(withOpenKey("?view=records&units=metric", "ride", "abc")).toBe(
      "?view=records&units=metric&ride=abc",
    );
  });

  it("replaces an item already open", () => {
    expect(withOpenKey("?ride=abc&q=tam", "ride", "def")).toBe(
      "?ride=def&q=tam",
    );
  });

  it("removes the item and keeps the rest", () => {
    expect(withOpenKey("?q=tam&ride=abc", "ride", null)).toBe("?q=tam");
    expect(withOpenKey("?ride=abc", "ride", null)).toBe("");
  });

  it("leaves a repository's slash readable", () => {
    expect(withOpenKey("", "item", "bendrucker/dotfiles")).toBe(
      "?item=bendrucker/dotfiles",
    );
  });

  it("round-trips through openKey", () => {
    const search = withOpenKey("?lang=Go", "item", "a b/c&d");
    expect(openKey(search, "item")).toBe("a b/c&d");
  });
});

describe("openStep", () => {
  it("pushes the first item, so Back closes it", () => {
    expect(openStep(null)).toBe("push");
  });

  it("replaces an open item rather than stacking entries", () => {
    expect(openStep("abc")).toBe("replace");
  });
});

describe("closeStep", () => {
  it("goes back from an entry the modal pushed", () => {
    expect(closeStep(true)).toBe("back");
  });

  it("rewrites the URL of a page that loaded with the item open", () => {
    expect(closeStep(false)).toBe("replace");
  });
});

describe("ownsTraversal", () => {
  const at = (href: string) => new URL(href, ORIGIN);

  it("owns a traversal that opens or closes an item on the same list", () => {
    expect(ownsTraversal(at("/rides"), at("/rides?ride=abc"), "ride")).toBe(
      true,
    );
    expect(
      ownsTraversal(
        at("/rides?view=records&ride=abc"),
        at("/rides?view=records"),
        "ride",
      ),
    ).toBe(true);
  });

  it("owns one between two items", () => {
    expect(
      ownsTraversal(at("/rides?ride=abc"), at("/rides?ride=def"), "ride"),
    ).toBe(true);
  });

  it("treats a trailing slash as the same list", () => {
    expect(ownsTraversal(at("/rides/"), at("/rides?ride=abc"), "ride")).toBe(
      true,
    );
  });

  it("leaves a traversal to another page to the router", () => {
    expect(ownsTraversal(at("/rides?ride=abc"), at("/rides/abc"), "ride")).toBe(
      false,
    );
  });

  it("leaves one that keeps the same item, like a hash, to the router", () => {
    expect(ownsTraversal(at("/code"), at("/code#month-2026-09"), "item")).toBe(
      false,
    );
  });
});

describe("isPlainClick", () => {
  const click = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  };

  it("takes a primary click with no modifier", () => {
    expect(isPlainClick(click)).toBe(true);
  });

  it.each([
    ["a middle click", { button: 1 }],
    ["a cmd-click", { metaKey: true }],
    ["a ctrl-click", { ctrlKey: true }],
    ["a shift-click", { shiftKey: true }],
    ["an alt-click", { altKey: true }],
    ["a click something else handled", { defaultPrevented: true }],
  ])("leaves %s to the browser", (_, change) => {
    expect(isPlainClick({ ...click, ...change })).toBe(false);
  });
});

function keyOf(pathname: string): string | null {
  return /^\/rides\/([^/]+)$/.exec(pathname)?.[1] ?? null;
}

function link(href: string, attributes: Record<string, string> = {}) {
  return {
    href,
    target: attributes.target ?? "",
    hasAttribute: (name: string) => name in attributes,
  };
}

describe("linkKey", () => {
  it("reads the item a same-origin link opens", () => {
    expect(
      linkKey(link(`${ORIGIN}/rides/abc?units=metric`), ORIGIN, keyOf),
    ).toBe("abc");
    expect(linkKey(link(`${ORIGIN}/rides/abc/`), ORIGIN, keyOf)).toBe("abc");
  });

  it("leaves a link to another path alone", () => {
    expect(linkKey(link(`${ORIGIN}/rides`), ORIGIN, keyOf)).toBeNull();
  });

  it("leaves a link to another origin alone", () => {
    expect(
      linkKey(link("https://strava.com/rides/abc"), ORIGIN, keyOf),
    ).toBeNull();
  });

  it("leaves a link to another tab or a download alone", () => {
    expect(
      linkKey(link(`${ORIGIN}/rides/abc`, { target: "_blank" }), ORIGIN, keyOf),
    ).toBeNull();
    expect(
      linkKey(link(`${ORIGIN}/rides/abc`, { download: "" }), ORIGIN, keyOf),
    ).toBeNull();
  });
});
