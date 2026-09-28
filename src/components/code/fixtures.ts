// Rows for the Code route's story, shaped as `buildCodeRows` hands them to
// the island: a project, other people's repositories, and the site's own.
import type { CodeRow, LanguageOption } from "@/code/view";

const GO = "#00ADD8";
const TS = "#3178c6";
const RUBY = "#701516";
const HCL = "#844FBA";

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
    langs: ["Go", "HCL"],
    day: "2026-09-19",
    score: 12,
    activity: 22,
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

export const CODE_LANGUAGES: LanguageOption[] = [
  { value: "TypeScript", label: "TypeScript", color: TS },
  { value: "Go", label: "Go", color: GO },
  { value: "HCL", label: "HCL", color: HCL },
  { value: "Ruby", label: "Ruby", color: RUBY },
];
