#!/usr/bin/env bash
# Upload split sections to Azure Blob Storage
# Usage: ./scripts/upload-cdn.sh
#
# Required environment variables:
#   AZURE_STORAGE_ACCOUNT   — Azure Storage account name
#   AZURE_STORAGE_KEY       — Azure Storage account key
#   AZURE_CDN_PROFILE       — (optional) CDN profile name for cache purge
#   AZURE_CDN_ENDPOINT      — (optional) CDN endpoint name for cache purge
#   AZURE_RESOURCE_GROUP    — (optional) Resource group for CDN purge

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Get version from package.json
VERSION=$(node -p "require('$ROOT_DIR/packages/cli/package.json').version")
CONTAINER="agentinit"
SOURCE_DIR="$ROOT_DIR/dist/cdn/v${VERSION}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "❌ dist/cdn/v${VERSION} not found. Run 'npm run split' first."
  exit 1
fi

echo "📦 Uploading v${VERSION} to Azure Blob Storage..."
echo "   Account: $AZURE_STORAGE_ACCOUNT"
echo "   Container: $CONTAINER"
echo "   Source: $SOURCE_DIR"

# Ensure container exists
az storage container create \
  --name "$CONTAINER" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --account-key "$AZURE_STORAGE_KEY" \
  --public-access blob \
  --output none 2>/dev/null || true

# Upload all files with proper content types
az storage blob upload-batch \
  --source "$SOURCE_DIR" \
  --destination "$CONTAINER" \
  --destination-path "v${VERSION}" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --account-key "$AZURE_STORAGE_KEY" \
  --content-type "text/markdown" \
  --overwrite \
  --output none

# Fix content type for manifest.json
az storage blob upload \
  --file "$SOURCE_DIR/manifest.json" \
  --container-name "$CONTAINER" \
  --name "v${VERSION}/manifest.json" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --account-key "$AZURE_STORAGE_KEY" \
  --content-type "application/json" \
  --overwrite \
  --output none

echo "✅ Uploaded to: https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/v${VERSION}/"

# CDN cache purge (optional)
if [[ -n "${AZURE_CDN_PROFILE:-}" && -n "${AZURE_CDN_ENDPOINT:-}" && -n "${AZURE_RESOURCE_GROUP:-}" ]]; then
  echo "🔄 Purging CDN cache for /agentinit/v${VERSION}/*"
  az cdn endpoint purge \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --profile-name "$AZURE_CDN_PROFILE" \
    --name "$AZURE_CDN_ENDPOINT" \
    --content-paths "/agentinit/v${VERSION}/*" \
    --output none
  echo "✅ CDN cache purged"
else
  echo "ℹ️  Skipping CDN cache purge (AZURE_CDN_PROFILE/ENDPOINT/RESOURCE_GROUP not set)"
fi
