#!/usr/bin/env tsx

// The built worker, running locally over a seeded database. `astro dev` cannot
// render this site the way production does: islands wrapping reka server-render
// empty under it, and `SegmentedControl.vue` is the cycling page's view
// switcher. This serves `dist` through workerd, which gets the assets binding,
// the parsed `_headers` and redirect rules, and the caching middleware too.
//
//   npm run dev:worker              build, migrate, seed if empty, start
//   npm run dev:worker -- status    is one running, and where
//   npm run dev:worker -- logs      what it has printed
//   npm run dev:worker -- logs -f   follow it
//   npm run dev:worker -- stop      shut it down
//
// Flags on the start command: `--port <n>` to override the port, `--no-build`
// to serve the `dist` already on disk, `--reseed` to rewrite the rides.

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { logger } from "@workspace/logger";
import { z } from "zod";

const DATABASE = "bendrucker-activity";

const STATE_DIR = path.resolve(import.meta.dirname, "../.wrangler/dev-worker");
const PID_FILE = path.join(STATE_DIR, "state.json");
const LOG_FILE = path.join(STATE_DIR, "worker.log");

/**
 * Ports the worktree picks from. Wrangler's own default is 8787 for every
 * checkout, and a second `wrangler dev` on a taken port does not fall back: it
 * dies with a fatal workerd "Address already in use".
 */
const PORT_BASE = 8800;
const PORT_RANGE = 100;

const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 250;

const state = z.object({ pid: z.int().positive(), port: z.int().positive() });
type State = z.infer<typeof state>;

const countRow = z.object({ n: z.int() });
const queryResult = z.array(z.object({ results: z.array(z.unknown()) })).min(1);

async function main(): Promise<void> {
  const [command = "start"] = process.argv.slice(2);
  switch (command) {
    case "status":
      return status();
    case "logs":
      return logs();
    case "stop":
      return stop();
    default:
      return start();
  }
}

async function start(): Promise<void> {
  const running = readState();
  if (running !== null) {
    logger.info(running, "A dev worker is already running. Stop it first.");
    return;
  }

  if (!process.argv.includes("--no-build")) {
    run("npm", ["run", "build"]);
  }

  run("wrangler", ["d1", "migrations", "apply", DATABASE, "--local"]);

  const reseed = process.argv.includes("--reseed");
  if (reseed || rideCount() === 0) {
    run("npm", ["run", "seed", "--", ...(reseed ? ["--reset"] : [])]);
  }

  const port = choosePort();
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(LOG_FILE, "");

  // Detached with its own process group, so the tsx process this runs in can
  // exit and leave the worker up, and `stop` can take the group down with it.
  const log = openSync(LOG_FILE, "a");
  const child = spawn(
    "wrangler",
    [
      "dev",
      "--local",
      "--port",
      String(port),
      // Pages swallow a failed query and render empty, which is the right
      // answer for a reader and the wrong one for the person looking at this.
      "--var",
      "LOCAL_ERRORS:true",
    ],
    { detached: true, stdio: ["ignore", log, log] },
  );
  child.unref();

  if (child.pid === undefined) {
    throw new Error("wrangler dev did not start");
  }
  writeFileSync(PID_FILE, JSON.stringify({ pid: child.pid, port }));

  await waitForReady(port);
  logger.info(
    { pid: child.pid, port, url: `http://localhost:${port}`, log: LOG_FILE },
    "Dev worker running",
  );
}

function status(): void {
  const running = readState();
  if (running === null) {
    logger.info("No dev worker running.");
    return;
  }
  logger.info(
    { ...running, url: `http://localhost:${running.port}`, log: LOG_FILE },
    "Dev worker running",
  );
}

function logs(): void {
  if (!existsSync(LOG_FILE)) {
    logger.info("No dev worker log yet.");
    return;
  }
  const follow =
    process.argv.includes("--follow") || process.argv.includes("-f");
  execFileSync("tail", [...(follow ? ["-f"] : []), LOG_FILE], {
    stdio: "inherit",
  });
}

function stop(): void {
  const running = readState();
  if (running === null) {
    logger.info("No dev worker running.");
    return;
  }
  // The negative pid is the process group. wrangler spawns workerd as a child,
  // and signalling the leader alone leaves workerd holding the port.
  process.kill(-running.pid, "SIGTERM");
  writeFileSync(PID_FILE, "");
  logger.info(running, "Stopped dev worker");
}

/**
 * The recorded worker, or null once it is gone. A stale state file outlives a
 * worker killed from outside, so the pid is checked rather than trusted.
 */
function readState(): State | null {
  if (!existsSync(PID_FILE)) return null;
  const contents = readFileSync(PID_FILE, "utf-8");
  if (contents === "") return null;
  const parsed = state.safeParse(JSON.parse(contents));
  if (!parsed.success) return null;
  try {
    process.kill(parsed.data.pid, 0);
  } catch {
    return null;
  }
  return parsed.data;
}

/** Stable per worktree, so two checkouts do not collide on one port. */
function choosePort(): number {
  const flag = process.argv.indexOf("--port");
  if (flag !== -1) {
    const value = Number(process.argv[flag + 1]);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error("--port takes a port number");
    }
    return value;
  }
  const digest = createHash("sha256").update(process.cwd()).digest();
  return PORT_BASE + (digest.readUInt16BE(0) % PORT_RANGE);
}

function rideCount(): number {
  const stdout = execFileSync(
    "wrangler",
    [
      "d1",
      "execute",
      DATABASE,
      "--local",
      "--json",
      "--command",
      "select count(*) as n from activity_feed",
    ],
    { encoding: "utf-8" },
  );
  const [first] = queryResult.parse(JSON.parse(stdout));
  const [row] = first!.results;
  return countRow.parse(row).n;
}

/**
 * Reported ready once the port answers. Wrangler prints its own banner well
 * before workerd binds, so a start that returned on the banner would hand back
 * a URL that refuses the next request.
 */
async function waitForReady(port: number): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${port}/`);
      return;
    } catch {
      await sleep(READY_POLL_MS);
    }
  }
  throw new Error(
    `wrangler dev did not answer on ${port} within ${READY_TIMEOUT_MS}ms. See ${LOG_FILE}`,
  );
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, { stdio: "inherit" });
}

await main();
