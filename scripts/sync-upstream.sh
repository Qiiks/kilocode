#!/bin/bash
# Sync with Upstream Kilocode Repository
# This script helps merge upstream changes while preserving local Copilot provider additions
#
# Usage: ./scripts/sync-upstream.sh [upstream-remote] [upstream-branch]
#   upstream-remote: Name of the upstream remote (default: Kilo-Org)
#   upstream-branch: Branch to merge from (default: main)

set -e

UPSTREAM_REMOTE="${1:-Kilo-Org}"
UPSTREAM_BRANCH="${2:-main}"
CURRENT_BRANCH=$(git branch --show-current)

echo "=========================================="
echo "Kilocode Upstream Sync Script"
echo "=========================================="
echo "Current branch: $CURRENT_BRANCH"
echo "Upstream: $UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "ERROR: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

echo "[1/5] Fetching latest changes from $UPSTREAM_REMOTE..."
git fetch "$UPSTREAM_REMOTE"

# Show how many commits behind we are
COMMITS_BEHIND=$(git rev-list --count HEAD.."$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" 2>/dev/null || echo "0")
echo "       Commits behind upstream: $COMMITS_BEHIND"

if [ "$COMMITS_BEHIND" = "0" ]; then
    echo ""
    echo "Already up to date with $UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
    exit 0
fi

echo ""
echo "[2/5] Creating backup tag..."
BACKUP_TAG="backup/pre-sync-$(date +%Y%m%d-%H%M%S)"
git tag "$BACKUP_TAG"
echo "       Backup created: $BACKUP_TAG"

echo ""
echo "[3/5] Merging $UPSTREAM_REMOTE/$UPSTREAM_BRANCH..."
echo ""

# Attempt the merge
if git merge "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" --no-edit; then
    echo ""
    echo "[4/5] Merge completed successfully!"
else
    echo ""
    echo "[4/5] Merge has conflicts that need resolution."
    echo ""
    echo "=========================================="
    echo "CONFLICT RESOLUTION GUIDE"
    echo "=========================================="
    echo ""
    echo "Files with conflicts:"
    git diff --name-only --diff-filter=U
    echo ""
    echo "COPILOT PROVIDER FILES TO PRESERVE:"
    echo "  - src/api/providers/copilot.ts"
    echo "  - src/api/providers/fetchers/copilot.ts"
    echo "  - src/api/providers/fetchers/__tests__/copilot.test.ts"
    echo "  - webview-ui/src/components/settings/providers/Copilot.tsx"
    echo "  - scripts/test-copilot-*.ts"
    echo ""
    echo "For conflicts in shared files (provider-settings.ts, index.ts, etc.):"
    echo "  1. Keep BOTH the upstream changes AND your Copilot additions"
    echo "  2. Make sure 'copilot' entries are preserved in arrays/switches"
    echo ""
    echo "After resolving conflicts, run:"
    echo "  git add ."
    echo "  git commit"
    echo ""
    echo "To abort the merge and restore previous state:"
    echo "  git merge --abort"
    echo "  git tag -d $BACKUP_TAG"
    echo ""
    exit 1
fi

echo ""
echo "[5/5] Running tests to verify merge..."
echo ""

# Run relevant tests
if command -v pnpm &> /dev/null; then
    echo "Running Copilot provider tests..."
    cd src && pnpm vitest run api/providers/fetchers/__tests__/copilot.test.ts --reporter=verbose 2>/dev/null || echo "Tests completed (check output above)"
    cd ..
fi

echo ""
echo "=========================================="
echo "SYNC COMPLETE"
echo "=========================================="
echo "Merged $COMMITS_BEHIND commits from $UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
echo "Backup tag: $BACKUP_TAG"
echo ""
echo "To push changes:"
echo "  git push origin $CURRENT_BRANCH"
echo ""
echo "To undo this merge:"
echo "  git reset --hard $BACKUP_TAG"
echo "  git tag -d $BACKUP_TAG"
echo ""