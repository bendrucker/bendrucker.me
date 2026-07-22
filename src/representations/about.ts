import { SITE } from "@/config";
import type { Representation } from "./types";
import aboutMd from "../pages/about.md?raw";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

export const about: Representation = {
  route: "/about",
  section: "Pages",
  render: async () =>
    `# About\n\n${aboutMd.replace(FRONTMATTER, "").trimStart()}`,
  list: async () => [
    {
      path: "/about",
      title: "About",
      description: `About ${SITE.author}.`,
    },
  ],
};
