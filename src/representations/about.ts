import type { Representation } from "./types";
import aboutMd from "../pages/about.md?raw";

export const about: Representation = {
  route: "/about",
  render: async () => aboutMd,
};
