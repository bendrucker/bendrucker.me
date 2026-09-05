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

# .vue carries every template ESLint is here for: oxlint's vue plugin reads
# <script> and never <template>, and eslint.config.js ignores every .ts and .js
# path, so linting .vue files is ESLint's whole job. .css, .md, and .json are
# what Prettier owns.
if ! echo "$changed" | grep -qE '\.(js|mjs|cjs|ts|astro|vue|css|md|json)$'; then
  exit 0
fi

errors=""

# Format only changed files that still exist on disk. `--list-different`
# alongside `--write` names the files Prettier actually rewrote, where the
# working tree names every file the turn touched.
changed_existing=$(echo "$changed" | while read -r f; do [ -f "$f" ] && echo "$f"; done | sort -u)
if [[ -n "$changed_existing" ]]; then
  formatted=$(npx prettier --write --list-different --ignore-unknown $changed_existing 2>/dev/null)
  if [[ -n "$formatted" ]]; then
    errors+="Prettier formatted files:\n${formatted}\n\nStage and commit the formatting changes.\n\n"
  fi
fi

if ! oxlint_output=$(npx oxlint 2>&1); then
  errors+="oxlint errors:\n${oxlint_output}\n\n"
fi

if ! eslint_output=$(npx eslint . 2>&1); then
  errors+="ESLint errors:\n${eslint_output}\n\n"
fi

if ! vitest_output=$(npx vitest run 2>&1); then
  errors+="Test failures:\n${vitest_output}\n\n"
fi

# The build costs an order of magnitude more than everything above it, and a
# turn that already has something to fix does not need it to find the next
# thing. Report what the cheap checks found and let the next turn reach here.
if [[ -n "$errors" ]]; then
  printf '%b' "$errors" >&2
  exit 2
fi

# Skip build if source files haven't changed since last successful build
build_marker="/tmp/claude-stop-hook-build-$(echo "$cwd" | md5sum | cut -d' ' -f1)"
newest_source=$(git ls-files -- '*.ts' '*.js' '*.mjs' '*.cjs' '*.astro' '*.vue' '*.md' '*.css' | xargs stat -f '%m' 2>/dev/null | sort -rn | head -1)

if [[ -f "$build_marker" ]] && [[ -n "$newest_source" ]]; then
  marker_time=$(stat -f '%m' "$build_marker")
  # No source files changed since the last successful build
  if [[ "$newest_source" -le "$marker_time" ]]; then
    exit 0
  fi
fi

if ! build_output=$(npm run build 2>&1); then
  printf '%b' "Build errors:\n${build_output}\n" >&2
  exit 2
fi

touch "$build_marker"
