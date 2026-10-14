import { SITE, isEnabled } from "@/config";
import { getDb } from "@/db";
import { queryCodeRows } from "@/code/query";
import { buildCodeRows, codeWindow } from "@/code/rows";
import type { CodeRow } from "@/code/view";
import type { Representation } from "./types";

const DESCRIPTION =
  "The repositories I have worked on lately, and the projects they belong to.";

function line(row: CodeRow): string {
  const url = new URL(row.href, SITE.website);
  const org = row.org ? ` (${row.org})` : "";
  const text = row.text ? `: ${row.text}` : "";
  return `- [${row.title}](${url.href})${org}${text}`;
}

export const code: Representation = {
  route: "/code",
  section: "Activity",

  async render() {
    if (!isEnabled("code")) return null;
    const repos = await queryCodeRows(await getDb(), codeWindow(new Date()));
    const rows = buildCodeRows(repos);
    return [
      `# Code`,
      "",
      DESCRIPTION,
      "",
      ...rows.map((row) => line(row)),
      "",
    ].join("\n");
  },

  list: async () =>
    isEnabled("code")
      ? [{ path: "/code", title: "Code", description: DESCRIPTION }]
      : [],
};
