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

# Everything Prettier, oxlint, ESLint, or the build reads. .vue needs ESLint
# for its <template> (oxlint's vue plugin only reads <script>); .css, .md, and
# .json are Prettier's alone.
extensions=(js mjs cjs ts astro vue css md json)
glob_patterns=("${extensions[@]/#/*.}")
extension_pattern=$(IFS='|'; echo "${extensions[*]}")

if ! echo "$changed" | grep -qE "\\.(${extension_pattern})\$"; then
  exit 0
fi

errors=""

run_check() {
  local label=$1 output
  shift
  if ! output=$("$@" 2>&1); then
    errors+="${label}:\n${output}\n\n"
  fi
}

# Format only changed files that still exist on disk. `--list-different`
# names the files Prettier rewrote, where the working tree names every file
# the turn touched.
changed_existing=$(echo "$changed" | while read -r f; do [ -f "$f" ] && echo "$f"; done | sort -u)
if [[ -n "$changed_existing" ]]; then
  formatted=$(npx prettier --write --list-different --ignore-unknown $changed_existing 2>/dev/null)
  if [[ -n "$formatted" ]]; then
    errors+="Prettier formatted files:\n${formatted}\n\nStage and commit the formatting changes.\n\n"
  fi
fi

run_check "oxlint errors" npx oxlint
run_check "ESLint errors" npx eslint .
run_check "Test failures" npx vitest run

# Cheap checks run before the build, so a turn with something to fix doesn't
# also wait on it.
if [[ -n "$errors" ]]; then
  printf '%b' "$errors" >&2
  exit 2
fi

# Skip build if source files haven't changed since last successful build
build_marker="/tmp/claude-stop-hook-build-$(echo "$cwd" | md5sum | cut -d' ' -f1)"
newest_source=$(git ls-files -- "${glob_patterns[@]}" | xargs stat -f '%m' 2>/dev/null | sort -rn | head -1)

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
