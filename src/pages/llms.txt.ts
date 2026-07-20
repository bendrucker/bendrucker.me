import type { APIRoute } from "astro";
import { SITE } from "@/config";
import { listRepresentations } from "@/representations";

export const GET: APIRoute = async ({ site }) => {
  const sections = await listRepresentations();

  const lines = [`# ${SITE.title}`, "", `> ${SITE.desc}`];

  for (const section of sections) {
    lines.push("", `## ${section.title}`, "");
    for (const { path, title, description } of section.entries) {
      const url = new URL(`${path}.md`, site);
      lines.push(
        description
          ? `- [${title}](${url}): ${description}`
          : `- [${title}](${url})`,
      );
    }
  }

  lines.push("");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
