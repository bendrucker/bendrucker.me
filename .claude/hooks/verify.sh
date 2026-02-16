#!/usr/bin/env bash

# Stop hook: verify formatting, lint, and build pass before Claude finishes its turn.
# Exit 2 blocks Claude from stopping and forces it to fix issues.

set -uo pipefail

input=$(cat)
cwd=$(jq -r '.cwd' <<< "$input")
cd "$cwd"

changed=$(
  git diff --name-only HEAD 2>/dev/null
  git diff --name-only --cached HEAD 2>/dev/null
  git ls-files --others --exclude-standard 2>/dev/null
)

if ! echo "$changed" | grep -qE '\.(js|mjs|cjs|ts|astro)$'; then
  exit 0
fi

errors=""

# Format only changed files that still exist on disk
changed_existing=$(echo "$changed" | while read -r f; do [ -f "$f" ] && echo "$f"; done | sort -u)
if [[ -n "$changed_existing" ]]; then
  npx prettier --write --ignore-unknown $changed_existing >/dev/null 2>&1
  formatted=$(git diff --name-only)
  if [[ -n "$formatted" ]]; then
    errors+="Prettier formatted files:\n${formatted}\n\nStage and commit the formatting changes.\n\n"
  fi
fi

if ! lint_output=$(npx eslint . 2>&1); then
  errors+="ESLint errors:\n${lint_output}\n\n"
fi

# Skip build if source files haven't changed since last successful build
build_marker="/tmp/claude-stop-hook-build-$(echo "$cwd" | md5sum | cut -d' ' -f1)"
newest_source=$(git ls-files -- '*.ts' '*.js' '*.mjs' '*.cjs' '*.astro' '*.md' '*.css' | xargs stat -f '%m' 2>/dev/null | sort -rn | head -1)

if [[ -f "$build_marker" ]] && [[ -n "$newest_source" ]]; then
  marker_time=$(stat -f '%m' "$build_marker")
  if [[ "$newest_source" -le "$marker_time" ]]; then
    # No source files changed since last successful build
    if [[ -n "$errors" ]]; then
      printf '%b' "$errors" >&2
      exit 2
    fi
    exit 0
  fi
fi

if ! build_output=$(npm run build 2>&1); then
  errors+="Build errors:\n${build_output}\n\n"
else
  touch "$build_marker"
fi

if [[ -n "$errors" ]]; then
  printf '%b' "$errors" >&2
  exit 2
fi
