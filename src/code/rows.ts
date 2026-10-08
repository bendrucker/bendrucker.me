// The Code list's rows, built on the server from the repositories touched in
// the window: each project once, and every repository outside one.
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { SITE } from "@/config";
import type { ScoredRepo } from "./query";
import { projects, repoScore, type Project } from "./rank";
import type { CodeRepo } from "./types";
import {
  byRecency,
  memberSummary,
  type CodeMember,
  type CodeRow,
  type LanguageOption,
} from "./view";

/** How far back the list reaches, by last contribution. It never shows on the page. */
export const CODE_WINDOW_DAYS = 90;

export function codeWindow(now: Date): { from: Date } {
  return { from: new Date(now.getTime() - CODE_WINDOW_DAYS * 86_400_000) };
}

/** GitHub's own gray, for a repository with no language it recognizes. */
export const UNKNOWN_LANGUAGE_COLOR = "#8b8b8b";

export function languageColor(repo: Pick<CodeRepo, "language">): string {
  return repo.language?.color || UNKNOWN_LANGUAGE_COLOR;
}

/** The calendar day an instant falls on where the site's owner lives. */
export function localDay(
  iso: string,
  timezone: string = SITE.timezone,
): string {
  return format(new TZDate(new Date(iso), timezone), "yyyy-MM-dd");
}

export function repoHref(repo: Pick<CodeRepo, "owner" | "name">): string {
  return `/code/${repo.owner}/${repo.name}/`;
}

/** Pull requests and issues opened in the window, for the "Most active" sort. */
function workCount(repo: CodeRepo): number {
  return repo.pulls.length + repo.issues.length;
}

function latest(isos: readonly string[]): string {
  return isos.toSorted().at(-1) ?? "";
}

function repoRow(repo: ScoredRepo, timezone: string): CodeRow {
  return {
    key: repo.repo,
    href: repoHref(repo),
    title: repo.name,
    org: repo.mine ? "" : repo.owner,
    text: repo.description,
    lead: "dot",
    dot: languageColor(repo),
    mine: repo.mine,
    langs: repo.language ? [repo.language.name] : [],
    day: localDay(repo.lastActivity, timezone),
    score: repo.score,
    activity: workCount(repo),
    members: [],
  };
}

function memberOf(repo: ScoredRepo, timezone: string): CodeMember {
  return {
    key: repo.repo,
    href: repoHref(repo),
    title: repo.name,
    text: repo.description,
    dot: languageColor(repo),
    lang: repo.language?.name ?? "",
    day: localDay(repo.lastActivity, timezone),
    activity: workCount(repo),
  };
}

function projectRow(project: Project<ScoredRepo>, timezone: string): CodeRow {
  const [best] = project.members;
  return {
    key: project.id,
    href: `/code/${project.id}/`,
    title: project.title,
    org: project.org,
    text: memberSummary(project.members.map((member) => member.name)),
    lead: "ring",
    dot: best ? languageColor(best) : UNKNOWN_LANGUAGE_COLOR,
    mine: project.mine,
    langs: [
      ...new Set(
        project.members.flatMap((member) =>
          member.language ? [member.language.name] : [],
        ),
      ),
    ],
    day: localDay(
      latest(project.members.map((member) => member.lastActivity)),
      timezone,
    ),
    score: project.score,
    activity: project.members.reduce(
      (sum, member) => sum + workCount(member),
      0,
    ),
    members: project.members.map((member) => memberOf(member, timezone)),
  };
}

/** Every row the window holds, most recently touched first. */
export function buildCodeRows(
  repos: readonly CodeRepo[],
  timezone: string = SITE.timezone,
): CodeRow[] {
  const scored = repos.map((repo) => ({ ...repo, score: repoScore(repo) }));
  const grouped = projects(scored);
  const inProject = new Set(
    grouped.flatMap((project) => project.members.map((member) => member.repo)),
  );

  return [
    ...grouped.map((project) => projectRow(project, timezone)),
    ...scored
      .filter((repo) => !inProject.has(repo.repo))
      .map((repo) => repoRow(repo, timezone)),
  ].toSorted(byRecency);
}

/** The languages in the window, the most common first, for the language select. */
export function languageOptions(repos: readonly CodeRepo[]): LanguageOption[] {
  const counts = new Map<string, { count: number; color: string }>();
  for (const repo of repos) {
    if (!repo.language) continue;
    const seen = counts.get(repo.language.name);
    counts.set(repo.language.name, {
      count: (seen?.count ?? 0) + 1,
      color: seen?.color ?? languageColor(repo),
    });
  }
  return [...counts]
    .toSorted(([a, x], [b, y]) => y.count - x.count || a.localeCompare(b))
    .map(([name, { color }]) => ({ value: name, label: name, color }));
}
