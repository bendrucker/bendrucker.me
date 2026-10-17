#!/usr/bin/env bash

# SessionStart hook for Claude Code cloud sessions.

set -euo pipefail

if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# The image's npm 10 `install` rewrites this npm 11 lockfile.
if [[ ! -f node_modules/.package-lock.json ]] ||
  [[ package-lock.json -nt node_modules/.package-lock.json ]]; then
  npm ci --no-audit --no-fund
fi

# Global, since the package ships 115MB of binaries CI doesn't need.
agent_browser=0.39.1
if [[ "$(agent-browser --version 2>/dev/null)" != "agent-browser ${agent_browser}" ]]; then
  npm install --global --no-audit --no-fund "agent-browser@${agent_browser}"
fi

if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  echo 'export AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"

  # Without a token, `astro dev` can't open the remote MEDIA proxy.
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo 'export CLOUDFLARE_VITE_FORCE_LOCAL=true' >> "$CLAUDE_ENV_FILE"
  fi
fi
