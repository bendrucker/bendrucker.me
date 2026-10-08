import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIContext } from "astro";
import type { Kysely } from "kysely";
import { syncActivity } from "@/activity/sync";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import { makeRepo } from "@/test/repos";

let db: Kysely<Database>;

vi.mock("@/db", () => ({
  getDb: async () => db,
}));

const { code } = await import("./code");

beforeEach(async () => {
  vi.useFakeTimers({ now: new Date("2025-06-10T00:00:00Z"), toFake: ["Date"] });
  db = createTestDb();
  await syncActivity(testStore(db), [
    makeRepo({ lastActivity: new Date("2025-06-01T00:00:00Z") }),
    makeRepo({
      owner: "someone",
      name: "solo",
      description: "Someone else's library",
      lastActivity: new Date("2025-05-16T00:00:00Z"),
    }),
    makeRepo({
      name: "stale",
      lastActivity: new Date("2020-01-01T00:00:00Z"),
    }),
  ]);
});

afterEach(async () => {
  vi.useRealTimers();
  await db.destroy();
});

describe("code", () => {
  it("lists the repositories in the window, linked to their pages", async () => {
    const md = await code.render({} as unknown as APIContext);

    expect(md).toContain("# Code");
    expect(md).toContain(
      "(https://www.bendrucker.me/code/bendrucker/cool-lib/)",
    );
    expect(md).toContain(
      "- [solo](https://www.bendrucker.me/code/someone/solo/) (someone): Someone else's library",
    );
    expect(md).not.toContain("stale");
  });

  it("lists itself once, with no count", async () => {
    expect(await code.list()).toEqual([
      {
        path: "/code",
        title: "Code",
        description:
          "The repositories I have worked on lately, and the projects they belong to.",
      },
    ]);
  });
});
