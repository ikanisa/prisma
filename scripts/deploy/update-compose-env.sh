#!/usr/bin/env bash
set -euo pipefail

# Update image tags in a .env-style compose file for all services.
# Usage: update-compose-env.sh <env-file> <new-tag>
# Variables updated: GATEWAY_IMAGE, RAG_IMAGE, AGENT_IMAGE, ANALYTICS_IMAGE, UI_IMAGE, WEB_IMAGE

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <env-file> <new-tag>" >&2
  exit 1
fi

ENV_FILE="$1"
NEW_TAG="$2"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

TMP_FILE="${ENV_FILE}.tmp"
cp "$ENV_FILE" "$TMP_FILE"

update_line() {
  local key="$1"
  # Replace tag after the last ':' in the image reference; preserves registry/repo
  # Example: ghcr.io/org/repo/gateway:abc123 -> ghcr.io/org/repo/gateway:NEW_TAG
  if grep -qE "^${key}=" "$TMP_FILE"; then
    sed -E -i.bak "s|^(${key}=[^:]+:)([^[:space:]]+)$|\\1${NEW_TAG}|" "$TMP_FILE"
  fi
}

for var in GATEWAY_IMAGE RAG_IMAGE AGENT_IMAGE ANALYTICS_IMAGE UI_IMAGE WEB_IMAGE; do
  update_line "$var"
done

mv "$TMP_FILE" "$ENV_FILE"
echo "Updated image tags in $ENV_FILE to :$NEW_TAG"

