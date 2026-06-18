#!/bin/bash
# PostToolUse hook: after Claude edits a TS/TSX file, auto-fix what ESLint can
# fix and block (exit 2) if any errors remain, feeding them back to the agent.
#
# The tree is lint-error-clean, so any error this surfaces was just introduced
# by the edit — fail fast and fix it before moving on. Warnings (e.g. the
# React-compiler backlog tracked in eslint.config.mjs) never fail ESLint, so
# they don't block here.
set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
[ -x node_modules/.bin/eslint ] || exit 0

# Auto-fix the fixable issues in place, then block on whatever errors remain.
node_modules/.bin/eslint --fix "$file" >/dev/null 2>&1 || true

if ! out=$(node_modules/.bin/eslint "$file" 2>&1); then
  echo "ESLint reports errors in $file — fix them before continuing:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
