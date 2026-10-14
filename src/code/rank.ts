// How the Code pages rank what they list. A pull request ranks by its
// repository's reach, its size, and the reactions it drew. A repository ranks
// by its single best pull request, and a project by its best repository lifted
// by the rest.
import { SITE } from "@/config";
import type { PullRow } from "./types";

/** A diff past this many lines ranks no higher, so a vendored drop can't lead. */
const SIZE_CAP = 2000;

export type ScoredPull = Pick<
  PullRow,
  "additions" | "deletions" | "reactions" | "mergedAt"
>;

export function prScore(pr: ScoredPull, stars: number): number {
  return (
    Math.log1p(stars) +
    0.5 * Math.log1p(Math.min(pr.additions + pr.deletions, SIZE_CAP)) +
    1.5 * Math.log1p(pr.reactions) +
    (pr.mergedAt ? 0.5 : 0)
  );
}

/** The repository's best pull request, or 0 with none. */
export function repoScore(repo: {
  stars: number;
  pulls: readonly ScoredPull[];
}): number {
  return Math.max(0, ...repo.pulls.map((pr) => prScore(pr, repo.stars)));
}

/**
 * The best repository's score plus `log1p` of the rest, so breadth counts
 * without a pile of small repositories outranking one big one.
 */
export function projectScore(scores: readonly number[]): number {
  const [best = 0, ...rest] = scores.toSorted((a, b) => b - a);
  return best + Math.log1p(rest.reduce((sum, score) => sum + score, 0));
}

/** How an organization reads as a project, where its login does not. */
export const ORG_TITLES: Readonly<Record<string, string>> = {
  "terraform-linters": "TFLint",
};

export interface ProjectConfig {
  id: string;
  title: string;
  /** `owner/name`, all under one owner. */
  repos: readonly string[];
}

/** Families among the site owner's own repositories. */
export const PROJECTS: readonly ProjectConfig[] = [
  {
    id: "creditcards",
    title: "creditcards",
    repos: ["bendrucker/creditcards", "bendrucker/creditcards-types"],
  },
];

const ownerOf = (repo: string) => repo.split("/")[0];

/**
 * A project never crosses owners, so a third-party plugin stays a row of its
 * own rather than folding into the tool it extends.
 */
export function assertSingleOwner(configured: readonly ProjectConfig[]): void {
  for (const project of configured) {
    if (new Set(project.repos.map(ownerOf)).size > 1) {
      throw new Error(`project ${project.id} crosses owners`);
    }
  }
}

assertSingleOwner(PROJECTS);

export interface ProjectMember {
  repo: string;
  owner: string;
  mine: boolean;
  score: number;
}

export interface Project<R extends ProjectMember> {
  id: string;
  title: string;
  /** The owner every member shares. */
  owner: string;
  /** The organization, when the title does not already name it. */
  org: string;
  mine: boolean;
  /** Strongest first. */
  members: R[];
  score: number;
}

export interface ProjectOptions {
  configured?: readonly ProjectConfig[];
  titles?: Readonly<Record<string, string>>;
}

/**
 * Someone else's organization holding two or more of the repositories is a
 * project by that rule alone. The configured families name the rest. A
 * project left with fewer than two of the repositories is not one.
 */
export function projects<R extends ProjectMember>(
  repos: readonly R[],
  { configured = PROJECTS, titles = ORG_TITLES }: ProjectOptions = {},
): Project<R>[] {
  const orgs = new Set(
    repos.filter((repo) => !repo.mine).map((repo) => repo.owner),
  );

  const specs = [
    ...[...orgs].map((owner) => ({
      id: owner,
      title: titles[owner] ?? owner,
      owner,
      org: true,
      has: (repo: R) => !repo.mine && repo.owner === owner,
    })),
    ...configured.map((project) => ({
      id: project.id,
      title: project.title,
      owner: ownerOf(project.repos[0] ?? ""),
      org: false,
      has: (repo: R) => project.repos.includes(repo.repo),
    })),
  ];

  return specs.flatMap((spec) => {
    const members = repos
      .filter((repo) => spec.has(repo))
      .toSorted((a, b) => b.score - a.score);
    if (members.length < 2) return [];

    return [
      {
        id: spec.id,
        title: spec.title,
        owner: spec.owner,
        org: spec.org && spec.owner !== spec.title ? spec.owner : "",
        mine: members.every((member) => member.mine),
        members,
        score: projectScore(members.map((member) => member.score)),
      },
    ];
  });
}

/** Whether `owner/name` belongs to the site's own GitHub user. */
export function isMine(repo: string): boolean {
  return ownerOf(repo) === SITE.githubUsername;
}
