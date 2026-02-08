#!/usr/bin/env bash

# Stop hook: verify lint and build pass before Claude finishes its turn.
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

if ! lint_output=$(npx eslint . 2>&1); then
  errors+="ESLint errors:\n${lint_output}\n\n"
fi

if ! build_output=$(npm run build 2>&1); then
  errors+="Build errors:\n${build_output}\n\n"
fi

if [[ -n "$errors" ]]; then
  printf '%b' "$errors" >&2
  exit 2
fi
