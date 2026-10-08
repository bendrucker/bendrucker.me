import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWorkItems } from "./work";

const issue = {
  __typename: "Issue",
  id: "I_open",
  number: 7,
  title: "An issue",
  state: "OPEN",
  stateReason: null,
  createdAt: "2026-01-01T00:00:00Z",
  closedAt: null,
  reactions: { totalCount: 2 },
  repository: { name: "repo", owner: { login: "bendrucker" } },
};

function respondWith(body: unknown) {
  vi.stubGlobal("fetch", async () =>
    Response.json(body, {
      headers: { "content-type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchWorkItems", () => {
  it("keeps the nodes that resolve when another one is gone", async () => {
    respondWith({
      data: { nodes: [issue, null, null] },
      errors: [
        {
          type: "NOT_FOUND",
          path: ["nodes", 1],
          message: "Could not resolve to a node with the global id of 'I_gone'",
        },
        {
          type: "FORBIDDEN",
          path: ["nodes", 2],
          message: "Resource not accessible by integration",
        },
      ],
    });

    const work = await fetchWorkItems(
      "token",
      ["I_open", "I_gone", "I_private"],
      "test",
    );

    expect(work.pullRequests).toEqual([]);
    expect(work.issues.map((item) => item.id)).toEqual(["I_open"]);
  });

  it("rethrows any other error", async () => {
    respondWith({
      data: null,
      errors: [
        { type: "RATE_LIMITED", path: ["nodes"], message: "API rate limit" },
      ],
    });

    await expect(fetchWorkItems("token", ["I_open"], "test")).rejects.toThrow(
      /rate limit/,
    );
  });
});
