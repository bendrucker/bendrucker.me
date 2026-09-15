import { expect, test } from "vitest";
import { getPath } from "./path";

// `trailingSlash: "always"` redirects the bare form, so a link without the
// slash costs every reader and every crawler a redirect.
test.each<{ name: string; id: string; path: string }>([
  { name: "a post", id: "going-all-in", path: "/posts/going-all-in/" },
  {
    name: "a post under a directory",
    id: "2016/going-all-in",
    path: "/posts/2016/going-all-in/",
  },
])("$name", ({ id, path }) => {
  expect(getPath(id)).toBe(path);
});
