---
name: feedback
description: Work through UI comments left with the Agentation toolbar in the browser, hands-free, until the user stops. Use when asked to watch for feedback, take UI comments, or start a feedback loop.
---

# Feedback

The toolbar in the bottom corner of every dev page posts each comment to the `agentation` MCP server from `.mcp.json`. It shows under `astro dev`, and under `npm run dev:worker` when started as `AGENTATION=1 npm run dev:worker`. Production builds never carry it.

Each annotation names its element three ways:

- `attributes["data-source"]`: the `.vue` file and line that rendered the element. Edit there.
- `elementPath`, `cssClasses`, `nearbyText`: for markup from `.astro` files, which carry no `data-source`. Grep for these.
- `url`: the page and port. Every worktree's sessions share one server on port 4747, so act only on annotations whose port is this worktree's dev server, and leave the rest pending for the session that owns them.

## Loop

1. Call `agentation_watch_annotations` with `timeoutSeconds: 300`. A timeout with nothing new means call it again.
2. For each annotation in the batch, call `agentation_acknowledge`, then make the change.
3. Call `agentation_resolve` with a one-line `summary` of what changed. If the comment can't be acted on without a decision, call `agentation_reply` with the question and leave it open. Use `agentation_dismiss` with a reason when it is out of scope.
4. Go back to the first step.

The HTTP server on port 4747 lives in whichever session started it first, and the rest only connect to it. When that session exits, every `agentation` tool fails to reach the server. Tell the user to reconnect `agentation` from `/mcp`, which starts a new server in this session, then resume the loop.

Start with `agentation_get_all_pending`, so comments left before the loop began get handled too.

Keep each change small enough to see on the next reload. The user is clicking through the page while you work, so don't restart the dev server or rebuild unless a change requires it. `dev:worker` serves a build and needs a restart to show any edit.
