// A page that swallows a failed read still answers 200, which the edge would
// otherwise keep for every reader until the next sync. A read that fails marks
// the request it belongs to, and the cache middleware declines to store it.
import { AsyncLocalStorage } from "node:async_hooks";

const rendering = new AsyncLocalStorage<{ degraded: boolean }>();

/** Marks the response being rendered as missing data it failed to read. */
export function markDegraded(): void {
  const state = rendering.getStore();
  if (state) state.degraded = true;
}

/** Runs a render and reports whether anything inside it called `markDegraded`. */
export async function trackDegraded<T>(
  render: () => Promise<T>,
): Promise<{ value: T; degraded: boolean }> {
  const state = { degraded: false };
  const value = await rendering.run(state, render);
  return { value, degraded: state.degraded };
}
