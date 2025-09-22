#!/usr/bin/env bash
set -euo pipefail

main_branch="main"
remote="origin"
feature_branch=$(git symbolic-ref --short HEAD)

# Abort if already on main
if [[ "$feature_branch" == "$main_branch" ]]; then
  echo "❌ You are already on '$main_branch'. This script should be run from a feature branch." >&2
  exit 1
fi

# Ensure working tree is clean
if ! git diff-index --quiet HEAD --; then
  echo "❌ Working tree is dirty. Commit or stash your changes first." >&2
  exit 1
fi

echo "🚀 Fetching latest from $remote..."
git fetch "$remote" --prune

echo "📦 Rebasing $feature_branch onto $remote/$main_branch..."
git rebase --autostash "$remote/$main_branch"

rollback_tag="rollback-${feature_branch}-$(date +%Y%m%d%H%M%S)"
echo "🔁 Tagging rollback point: $rollback_tag"
git tag "$rollback_tag"

echo "🔄 Switching to $main_branch..."
git checkout "$main_branch"

echo "🔗 Fast-forward merging $feature_branch..."
git merge --ff-only "$feature_branch"

echo "📤 Atomic push: pushing $main_branch + rollback tag + deleting remote $feature_branch..."
git push --atomic "$remote" "$main_branch" ":$feature_branch" "refs/tags/$rollback_tag"

echo "🧹 Deleting local feature branch..."
git branch -d "$feature_branch"

echo "✅ Merge completed successfully!"


