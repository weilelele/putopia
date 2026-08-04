#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "ERROR: production source must be the main branch; current branch is $branch." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: production source worktree is dirty." >&2
  git status --short >&2
  exit 1
fi

git fetch --quiet origin main

local_head="$(git rev-parse HEAD)"
remote_main="$(git rev-parse refs/remotes/origin/main)"
if [[ "$local_head" != "$remote_main" ]]; then
  echo "ERROR: local main does not exactly match origin/main." >&2
  echo "local:  $local_head" >&2
  echo "remote: $remote_main" >&2
  exit 1
fi

echo "Production source verified: main @ ${local_head:0:12}"
echo "Normal releases must still proceed through the Vercel Git integration."
