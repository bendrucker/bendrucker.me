#!/usr/bin/env bash

# SessionStart hook for Claude Code cloud sessions. A local checkout already
# has its dependencies and browser, so this exits there.

set -euo pipefail

if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# `npm ci` rather than `npm install`: the image's npm 10 rewrites a lockfile
# written by npm 11, dropping its `libc` fields, and leaves every session with
# a dirty tree. The container is snapshotted once this hook finishes, so the
# check skips the install on a resumed session whose lockfile hasn't moved.
if [[ ! -f node_modules/.package-lock.json ]] ||
  [[ package-lock.json -nt node_modules/.package-lock.json ]]; then
  npm ci --no-audit --no-fund
fi

# Global rather than a devDependency: the package ships every platform's
# binary, 115MB that CI would install for a tool only agents use. Pinned
# because an unpinned install has resolved to a stale release that lacks
# `session id`, which the local-loop skill calls.
agent_browser=0.39.1
if [[ "$(agent-browser --version 2>/dev/null)" != "agent-browser ${agent_browser}" ]]; then
  npm install --global --no-audit --no-fund "agent-browser@${agent_browser}"
fi

if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  # The image's Playwright Chromium, so agent-browser never downloads Chrome.
  echo 'export AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"

  # `astro dev` opens a remote proxy session for the MEDIA binding, which
  # needs a Cloudflare token the container doesn't have. Forcing local trades
  # video posters for a dev server that starts.
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo 'export CLOUDFLARE_VITE_FORCE_LOCAL=true' >> "$CLAUDE_ENV_FILE"
  fi
fi
