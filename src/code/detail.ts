// Builds a repository's or a project's detail on the server, for its page,
// for a shared link that opens it over the Code list, and for the `.json`
// beside each page. `detailWire.ts` holds the shape and the browser's half.
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import type { CodeDetail } from "./detailWire";
import { parseCodeKey } from "./detailWire";
import {
  memberHref,
  moreUrl,
  projectStatTiles,
  repoStatTiles,
  workList,
} from "./page";
import {
  queryProject,
  queryRepo,
  type ProjectPage,
  type RepoPage,
} from "./query";
import { languageColor } from "./rows";
import { memberSummary } from "./view";

export function repoDetail({ repo, stats }: RepoPage): CodeDetail {
  const work = workList([repo]);
  return {
    key: repo.repo,
    title: repo.name,
    org: repo.mine ? undefined : repo.owner,
    dek: repo.description || undefined,
    mark: "dot",
    dot: languageColor(repo),
    githubUrl: repo.url,
    tiles: repoStatTiles(stats),
    members: [],
    work: work.items,
    moreHref: work.more ? moreUrl({ repos: [repo.repo] }) : undefined,
    description: repo.description || `${repo.repo} on GitHub`,
  };
}

/** `id` is the one the page was asked for, which an organization's page shares with its owner. */
export function projectDetail(
  { project, stats }: ProjectPage,
  id: string,
): CodeDetail {
  const isOrg = project.owner === id && !project.mine;
  const [best] = project.members;
  const work = workList(project.members, { withRepo: true });
  return {
    key: project.id,
    title: project.title,
    org: project.org || undefined,
    mark: "ring",
    dot: best ? languageColor(best) : "currentColor",
    githubUrl: isOrg ? `https://github.com/${project.owner}` : undefined,
    tiles: projectStatTiles(stats),
    members: project.members.map((member) => ({
      href: memberHref(member, project.id),
      title: member.name,
      text: member.description || undefined,
      dot: languageColor(member),
    })),
    work: work.items,
    moreHref: work.more
      ? moreUrl(
          isOrg
            ? { org: project.owner }
            : { repos: project.members.map((member) => member.repo) },
        )
      : undefined,
    description: `${project.title}: ${memberSummary(project.members.map((member) => member.name))}`,
  };
}

/**
 * A project by its id. Someone else's organization wins over a configured
 * family of the same name, since `/code/<owner>` reads as that owner's page.
 */
export async function loadProject(
  db: Kysely<Database>,
  id: string,
): Promise<ProjectPage | null> {
  return (
    (await queryProject(db, id, { configured: [] })) ??
    (await queryProject(db, id))
  );
}

/** The item a key names, or null for a malformed key or one with no work stored. */
export async function loadCodeDetail(
  db: Kysely<Database>,
  key: string,
): Promise<CodeDetail | null> {
  const parsed = parseCodeKey(key);
  if (parsed === null) return null;
  if (parsed.kind === "repo") {
    const page = await queryRepo(db, parsed.owner, parsed.name);
    return page && repoDetail(page);
  }
  const page = await loadProject(db, parsed.id);
  return page && projectDetail(page, parsed.id);
}
