#!/bin/bash
set -euo pipefail

# SessionStart hook for putopia.
# Installs dependencies so Claude Code on the web has node_modules available —
# this is what makes the AGENTS.md rule ("read node_modules/next/dist/docs
# before writing code") actually enforceable in fresh web sessions.
#
# Web-only: local developers manage their own dependencies.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# npm install (not ci) so the cached container layer is reused across sessions.
npm install
