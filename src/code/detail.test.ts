import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { syncActivity } from "@/activity/sync";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import { makeIssue, makePullRequest, makeRepo } from "@/test/repos";
import { loadCodeDetail } from "./detail";
import {
  codeDetail,
  codeDetailUrl,
  codeKey,
  codePageHref,
  parseCodeKey,
} from "./detailWire";

describe("codeKey", () => {
  it("reads a repository's page as owner and name", () => {
    expect(codeKey("/code/bendrucker/dotfiles")).toBe("bendrucker/dotfiles");
  });

  it("reads a project's page as its id", () => {
    expect(codeKey("/code/terraform-linters")).toBe("terraform-linters");
  });

  it("is null for the list and for deeper paths", () => {
    expect(codeKey("/code")).toBeNull();
    expect(codeKey("/code/a/b/c")).toBeNull();
  });

  it("refuses a segment GitHub wouldn't allow in a name", () => {
    expect(codeKey("/code/a%20b")).toBeNull();
  });
});

describe("parseCodeKey", () => {
  it("tells a repository from a project", () => {
    expect(parseCodeKey("a/b")).toEqual({
      kind: "repo",
      owner: "a",
      name: "b",
    });
    expect(parseCodeKey("a")).toEqual({ kind: "project", id: "a" });
  });

  it("refuses an empty or overlong key", () => {
    expect(parseCodeKey("")).toBeNull();
    expect(parseCodeKey("a/")).toBeNull();
    expect(parseCodeKey("a/b/c")).toBeNull();
  });
});

describe("codePageHref", () => {
  it("is the item's page, with its JSON beside it", () => {
    expect(codePageHref("bendrucker/dotfiles")).toBe(
      "/code/bendrucker/dotfiles",
    );
    expect(codeDetailUrl("tflint")).toBe("/code/tflint.json");
  });
});

describe("loadCodeDetail", () => {
  let db: Kysely<Database>;

  const TFLINT = { owner: "terraform-linters", name: "tflint" };

  beforeEach(async () => {
    db = createTestDb();
    await syncActivity(
      testStore(db),
      [
        makeRepo({ lastActivity: new Date("2025-06-01T00:00:00Z") }),
        makeRepo({
          ...TFLINT,
          url: "https://github.com/terraform-linters/tflint",
          stargazerCount: 5000,
        }),
        makeRepo({
          owner: "terraform-linters",
          name: "tflint-ruleset-aws",
          url: "https://github.com/terraform-linters/tflint-ruleset-aws",
        }),
      ],
      {
        work: {
          pullRequests: [
            makePullRequest({
              id: "PR_mine",
              createdAt: new Date("2025-05-20T00:00:00Z"),
            }),
            makePullRequest({
              id: "PR_tflint",
              repository: TFLINT,
              createdAt: new Date("2024-03-01T00:00:00Z"),
            }),
          ],
          issues: [
            makeIssue({
              id: "I_aws",
              repository: { ...TFLINT, name: "tflint-ruleset-aws" },
              createdAt: new Date("2023-08-01T00:00:00Z"),
            }),
          ],
        },
      },
    );
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("builds a repository's detail", async () => {
    const detail = await loadCodeDetail(db, "terraform-linters/tflint");

    expect(detail).toMatchObject({
      key: "terraform-linters/tflint",
      title: "tflint",
      org: "terraform-linters",
      mark: "dot",
      githubUrl: "https://github.com/terraform-linters/tflint",
      members: [],
    });
    expect(detail?.work.map((item) => item.id)).toEqual(["PR_tflint"]);
  });

  it("builds an organization's detail across its repositories", async () => {
    const detail = await loadCodeDetail(db, "terraform-linters");

    expect(detail?.mark).toBe("ring");
    expect(detail?.githubUrl).toBe("https://github.com/terraform-linters");
    expect(detail?.members.map((member) => member.title)).toEqual([
      "tflint",
      "tflint-ruleset-aws",
    ]);
    expect(detail?.work.map((item) => item.repo)).toEqual([
      "tflint",
      "tflint-ruleset-aws",
    ]);
  });

  it("survives the trip through JSON and the browser's schema", async () => {
    const detail = await loadCodeDetail(db, "terraform-linters");

    const received: unknown = await Response.json(detail).json();

    // `toEqual` reads a key set to undefined as absent, which is what JSON
    // makes of it.
    expect(codeDetail.parse(received)).toEqual(detail);
  });

  it("is null for a key that names nothing with work, or no key at all", async () => {
    expect(await loadCodeDetail(db, "someone/unknown")).toBeNull();
    expect(await loadCodeDetail(db, "../etc")).toBeNull();
  });
});
