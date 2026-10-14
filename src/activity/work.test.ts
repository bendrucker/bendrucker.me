import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import type { WorkItems } from "@workspace/github";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import { makeIssue, makePullRequest, makeRepo } from "@/test/repos";
import type { ActivityStore } from "./store";
import { syncActivity } from "./sync";
import { queryWorkToFetch } from "./work";

const merged = makePullRequest({
  state: "MERGED",
  mergedAt: new Date("2025-05-03T00:00:00.000Z"),
  reactions: 2,
});

const closed = makeIssue({
  state: "CLOSED",
  stateReason: "NOT_PLANNED",
  closedAt: new Date("2025-04-02T00:00:00.000Z"),
});

const work = (items: Partial<WorkItems>): WorkItems => ({
  pullRequests: [],
  issues: [],
  ...items,
});

describe("syncing pull requests and issues", () => {
  let db: Kysely<Database>;
  let store: ActivityStore;

  beforeEach(() => {
    db = createTestDb();
    store = testStore(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  const pullRows = async () =>
    db.selectFrom("pullRequests").selectAll().execute();
  const issueRows = async () => db.selectFrom("issues").selectAll().execute();
  const sync = async (items: Partial<WorkItems>) =>
    syncActivity(store, [makeRepo()], { work: work(items) });

  it("stores each one against its repository", async () => {
    await sync({ pullRequests: [merged], issues: [makeIssue()] });

    const { id: repoId } = await db
      .selectFrom("repos")
      .select("id")
      .executeTakeFirstOrThrow();

    expect(await pullRows()).toEqual([
      {
        id: "PR_1",
        repoId,
        number: 1,
        title: "Add a thing",
        state: "MERGED",
        isDraft: 0,
        createdAt: "2025-05-01T00:00:00.000Z",
        mergedAt: "2025-05-03T00:00:00.000Z",
        additions: 40,
        deletions: 10,
        reactions: 2,
      },
    ]);
    expect(await issueRows()).toEqual([
      {
        id: "I_1",
        repoId,
        number: 2,
        title: "A thing is missing",
        state: "OPEN",
        stateReason: null,
        createdAt: "2025-04-01T00:00:00.000Z",
        closedAt: null,
        reactions: 0,
      },
    ]);
  });

  it("moves an open pull request to merged", async () => {
    await sync({ pullRequests: [makePullRequest()] });

    const result = await sync({ pullRequests: [merged] });

    expect(result.changes).toBe(1);
    expect(result.version).toBe(2);
    expect(await pullRows()).toMatchObject([
      { state: "MERGED", mergedAt: "2025-05-03T00:00:00.000Z", reactions: 2 },
    ]);
  });

  it("leaves a merged pull request as it was stored", async () => {
    await sync({ pullRequests: [merged] });

    const result = await sync({
      pullRequests: [{ ...merged, title: "Renamed", reactions: 9 }],
    });

    expect(result.changes).toBe(0);
    expect(result.version).toBe(1);
    expect(await pullRows()).toMatchObject([
      { title: "Add a thing", reactions: 2 },
    ]);
  });

  it("leaves a closed issue as it was stored", async () => {
    await sync({ issues: [closed] });

    const { changes } = await sync({
      issues: [{ ...closed, stateReason: "COMPLETED" }],
    });

    expect(changes).toBe(0);
    expect(await issueRows()).toMatchObject([{ stateReason: "NOT_PLANNED" }]);
  });

  it("skips the write when the same work repeats in another order", async () => {
    const second = makePullRequest({ id: "PR_2", number: 2 });
    await sync({ pullRequests: [makePullRequest(), second] });

    const { skipped } = await sync({
      pullRequests: [second, makePullRequest()],
    });

    expect(skipped).toBe(true);
  });

  // GitHub reports the repository's current name, which the stored repository
  // row keeps its old one until a fetch names it again.
  it("updates a row whose repository was renamed since it was stored", async () => {
    await sync({ pullRequests: [makePullRequest()] });

    const { changes } = await sync({
      pullRequests: [
        { ...merged, repository: { owner: "bendrucker", name: "new-name" } },
      ],
    });

    expect(changes).toBe(1);
    expect(await pullRows()).toMatchObject([{ state: "MERGED" }]);
  });

  it("skips an item whose repository was never stored", async () => {
    await sync({});

    const { changes } = await sync({
      pullRequests: [
        makePullRequest({ repository: { owner: "someone", name: "else" } }),
      ],
    });

    expect(changes).toBe(0);
    expect(await pullRows()).toEqual([]);
  });
});

describe("queryWorkToFetch", () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("names new and open items and leaves out terminal ones", async () => {
    await syncActivity(testStore(db), [makeRepo()], {
      work: work({
        pullRequests: [
          makePullRequest({ id: "PR_open" }),
          makePullRequest({ ...merged, id: "PR_merged", number: 2 }),
        ],
        issues: [
          makeIssue({ id: "I_open" }),
          makeIssue({ ...closed, id: "I_closed", number: 3 }),
        ],
      }),
    });

    const payload = [
      makeRepo({
        pullRequestIds: ["PR_merged", "PR_new", "PR_open"],
        issueIds: ["I_closed"],
      }),
    ];

    expect(await queryWorkToFetch(db, payload)).toEqual([
      "I_open",
      "PR_new",
      "PR_open",
    ]);
  });

  it("names every id a payload carries when nothing is stored", async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `PR_${i}`);

    expect(
      await queryWorkToFetch(db, [makeRepo({ pullRequestIds: ids })]),
    ).toEqual(ids.toSorted());
  });
});
