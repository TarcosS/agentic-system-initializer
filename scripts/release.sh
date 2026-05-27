#!/usr/bin/env bash
# Release script — bumps version, updates changelog, creates git tag
# Usage: ./scripts/release.sh <major|minor|patch>

set -euo pipefail

RELEASE_TYPE=${1:-}

if [[ ! "$RELEASE_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "Usage: $0 <major|minor|patch>"
  exit 1
fi

# Ensure working directory is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Ensure we're on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "❌ Releases must be created from the 'main' branch. Currently on '$BRANCH'."
  exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./packages/cli/package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case $RELEASE_TYPE in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW_VERSION"

# Update package.json version
cd packages/cli
npm version "$NEW_VERSION" --no-git-tag-version
cd ../..

# Update CHANGELOG.md — replace [Unreleased] header with new version
DATE=$(date +%Y-%m-%d)
sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" CHANGELOG.md
rm -f CHANGELOG.md.bak

# Update changelog links
sed -i.bak "s|\[Unreleased\]: \(.*\)/compare/v.*\.\.\.HEAD|[Unreleased]: \1/compare/v$NEW_VERSION...HEAD\n[$NEW_VERSION]: \1/compare/v$CURRENT_VERSION...v$NEW_VERSION|" CHANGELOG.md
rm -f CHANGELOG.md.bak

# Commit and tag
git add packages/cli/package.json CHANGELOG.md
git commit -m "chore(release): v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo "✅ Version bumped to $NEW_VERSION"
echo "✅ Git tag v$NEW_VERSION created"
echo ""
echo "Next steps:"
echo "  git push origin main --tags"
echo ""
echo "This will trigger the release workflow on GitHub Actions."
# echo "  The workflow will also publish to npm (when enabled)."
