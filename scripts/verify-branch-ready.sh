#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "ERROR: detached HEAD; create or switch to a task branch." >&2
  exit 1
fi

if [[ "$branch" == "main" ]]; then
  echo "ERROR: task changes must be on a feature branch, not main." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: the worktree is not clean. Commit only the intended files first." >&2
  git status --short >&2
  exit 1
fi

git fetch --quiet origin main

remote_main="$(git rev-parse refs/remotes/origin/main)"
merge_base="$(git merge-base HEAD "$remote_main")"

if [[ "$merge_base" != "$remote_main" ]]; then
  echo "ERROR: $branch is not based on the latest origin/main." >&2
  echo "Rebase the branch onto origin/main, then review the resulting diff." >&2
  exit 1
fi

commit_count="$(git rev-list --count "$remote_main"..HEAD)"
if [[ "$commit_count" == "0" ]]; then
  echo "ERROR: $branch has no commits beyond origin/main." >&2
  exit 1
fi

echo "Branch provenance verified: $branch"
echo "Base: origin/main @ ${remote_main:0:12}"
echo "Unique commits ($commit_count):"
git log --oneline "$remote_main"..HEAD
echo
echo "Files proposed for PR:"
git diff --name-status "$remote_main"...HEAD
