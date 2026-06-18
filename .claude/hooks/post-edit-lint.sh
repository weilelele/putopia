#!/bin/bash
# PostToolUse hook: after Claude edits a TS/TSX file, auto-fix what ESLint can
# fix and surface any *remaining* problems back to the agent as context.
#
# Advisory by design (always exits 0): the repo currently carries pre-existing
# lint errors, so a hard block (exit 2) would falsely stall edits to files whose
# errors Claude did not introduce. CI is the gate for the whole tree; this hook
# is fast, file-scoped feedback. Flip to exit 2 once the backlog is clean.
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

# Auto-fix the fixable issues in place, then report whatever remains.
node_modules/.bin/eslint --fix "$file" >/dev/null 2>&1 || true

if ! out=$(node_modules/.bin/eslint "$file" 2>&1); then
  ctx=$(printf 'ESLint still reports problems in %s after auto-fix:\n%s' "$file" "$out")
  jq -n --arg c "$ctx" \
    '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$c}}'
fi
exit 0
