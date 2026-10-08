// Rows for the Code route's story, shaped as `buildCodeRows` hands them to
// the island: a project, other people's repositories, and the site's own.
import type { CodeDetail } from "@/code/detailWire";
import type { CodeMember, CodeRow, LanguageOption } from "@/code/view";

const GO = "#00ADD8";
const TS = "#3178c6";
const RUBY = "#701516";
const HCL = "#844FBA";
const JS = "#f1e05a";

function member(
  key: string,
  day: string,
  dot: string,
  lang: string,
  activity: number,
  overrides: Partial<CodeMember> = {},
): CodeMember {
  return {
    key,
    href: `/code/${key}`,
    title: key.split("/").at(-1) ?? key,
    text: "",
    dot,
    lang,
    day,
    activity,
    ...overrides,
  };
}

function repo(
  key: string,
  day: string,
  dot: string,
  lang: string,
  overrides: Partial<CodeRow> = {},
): CodeRow {
  const [owner = "", name = ""] = key.split("/");
  const mine = owner === "bendrucker";
  return {
    key,
    href: `/code/${key}`,
    title: name,
    org: mine ? "" : owner,
    text: "",
    lead: "dot",
    dot,
    mine,
    langs: [lang],
    day,
    score: 0,
    activity: 1,
    members: [],
    ...overrides,
  };
}

export const CODE_ROWS: CodeRow[] = [
  repo("bendrucker/claude", "2026-09-24", TS, "TypeScript", {
    text: "My personal plugin marketplace and settings for Claude Code",
    activity: 14,
  }),
  repo("bendrucker/bendrucker.me", "2026-09-24", TS, "TypeScript", {
    text: "This is my personal website (bendrucker.me)",
    score: 4,
    activity: 31,
  }),
  repo("bendrucker/honeycomb-cli", "2026-09-23", GO, "Go", {
    text: "CLI for interacting with the Honeycomb API",
    activity: 6,
  }),
  repo("AltanS/collie", "2026-09-22", TS, "TypeScript", {
    text: "Self-hosted mobile terminal for coding agents on herdr (or tmux/zellij). PWA with push alerts",
    score: 3,
    activity: 2,
  }),
  {
    key: "terraform-linters",
    href: "/code/terraform-linters",
    title: "TFLint",
    org: "terraform-linters",
    text: "tflint, tflint-ruleset-aws, and 3 more",
    lead: "ring",
    dot: GO,
    mine: false,
    langs: ["Go", "JavaScript"],
    day: "2026-09-19",
    score: 12,
    activity: 22,
    members: [
      member("terraform-linters/tflint", "2026-09-19", GO, "Go", 12, {
        text: "A Pluggable Terraform Linter",
      }),
      member(
        "terraform-linters/tflint-ruleset-aws",
        "2026-09-15",
        GO,
        "Go",
        6,
        {
          text: "TFLint ruleset for terraform-provider-aws",
        },
      ),
      member("terraform-linters/tflint-plugin-sdk", "2026-09-02", GO, "Go", 2, {
        text: "Experimental: Plugin SDK for building custom TFLint rulesets",
      }),
      member(
        "terraform-linters/setup-tflint",
        "2026-09-04",
        JS,
        "JavaScript",
        1,
        {
          text: "GitHub action that sets up TFLint in your workflow",
        },
      ),
      member(
        "terraform-linters/tflint-load-config-action",
        "2026-07-28",
        JS,
        "JavaScript",
        1,
        { text: "GitHub action that loads a TFLint config" },
      ),
    ],
  },
  repo("backnotprop/plannotator", "2026-09-07", TS, "TypeScript", {
    text: "Annotate and review coding agent plans and code diffs visually, share with your team, send feedback to agents with one click.",
    score: 8,
    activity: 3,
  }),
  repo("raycast/extensions", "2026-09-04", TS, "TypeScript", {
    text: "Everything you need to extend Raycast.",
    score: 11,
    activity: 1,
  }),
  repo("oapi-codegen/oapi-codegen", "2026-08-19", GO, "Go", {
    text: "Generate Go client and server boilerplate from OpenAPI 3 specifications",
    score: 10,
    activity: 5,
  }),
  repo("bendrucker/terraform-credentials-keychain", "2026-08-08", GO, "Go", {
    text: "A Terraform credentials helper that stores your credentials in the system keychain",
  }),
  repo("Homebrew/brew", "2026-07-22", RUBY, "Ruby", {
    text: "The Package Manager for Everywhere",
    score: 9,
    activity: 2,
  }),
  repo("bendrucker/terraform-cloudflare-zone", "2026-07-03", HCL, "HCL", {
    text: "Terraform module for a Cloudflare zone",
  }),
];

/** A repository's detail, as its page and the list's modal show it. */
export const REPO_DETAIL: CodeDetail = {
  key: "terraform-linters/tflint",
  title: "tflint",
  org: "terraform-linters",
  dek: "A pluggable Terraform linter",
  mark: "dot",
  dot: GO,
  githubUrl: "https://github.com/terraform-linters/tflint",
  tiles: [
    { icon: "star", value: "5,212", label: "stars" },
    { icon: "git-pull-request", value: "142", label: "pull requests" },
    { icon: "circle-dot", value: "18", label: "issues" },
    { value: "Mar 2019", label: "since" },
  ],
  members: [],
  work: [
    {
      id: "pr1",
      title: "Pin the plugin SDK to the release that fixed provider schemas",
      url: "https://github.com/terraform-linters/tflint/pull/2100",
      state: "MERGED",
    },
    {
      id: "pr2",
      title: "Read module sources from the lockfile",
      url: "https://github.com/terraform-linters/tflint/pull/2101",
      state: "OPEN",
    },
    {
      id: "i1",
      title: "Crash on an empty module block",
      url: "https://github.com/terraform-linters/tflint/issues/2099",
      state: "ISSUE_DONE",
    },
    {
      id: "pr3",
      title: "Draft: parallel rule evaluation",
      url: "https://github.com/terraform-linters/tflint/pull/2090",
      state: "DRAFT",
    },
  ],
  moreHref:
    "https://github.com/search?type=issues&q=repo%3Aterraform-linters%2Ftflint+author%3Abendrucker",
  description: "A pluggable Terraform linter",
};

/** A project's detail, which lists its repositories above the work. */
export const PROJECT_DETAIL: CodeDetail = {
  key: "terraform-linters",
  title: "TFLint",
  org: "terraform-linters",
  mark: "ring",
  dot: GO,
  githubUrl: "https://github.com/terraform-linters",
  tiles: [
    { icon: "git-pull-request", value: "163", label: "pull requests" },
    { icon: "circle-dot", value: "21", label: "issues" },
    { icon: "folder-git-2", value: "3", label: "repositories" },
    { value: "Mar 2019", label: "since" },
  ],
  members: [
    {
      href: "/code/terraform-linters/tflint?from=terraform-linters",
      title: "tflint",
      text: "A pluggable Terraform linter",
      dot: GO,
    },
    {
      href: "/code/terraform-linters/tflint-ruleset-aws?from=terraform-linters",
      title: "tflint-ruleset-aws",
      text: "TFLint ruleset for terraform-provider-aws",
      dot: GO,
    },
    {
      href: "/code/terraform-linters/setup-tflint?from=terraform-linters",
      title: "setup-tflint",
      dot: TS,
    },
  ],
  work: REPO_DETAIL.work.map((item) => ({ ...item, repo: "tflint" })),
  description: "TFLint: tflint, tflint-ruleset-aws, setup-tflint",
};

export const CODE_LANGUAGES: LanguageOption[] = [
  { value: "TypeScript", label: "TypeScript", color: TS },
  { value: "Go", label: "Go", color: GO },
  { value: "HCL", label: "HCL", color: HCL },
  { value: "Ruby", label: "Ruby", color: RUBY },
  { value: "JavaScript", label: "JavaScript", color: JS },
];
