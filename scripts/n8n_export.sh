#!/usr/bin/env bash
set -euo pipefail

: "${N8N_HOST:?N8N_HOST is required}"
: "${N8N_API_KEY:?N8N_API_KEY is required}"

EXPORT_DIR="$(dirname "$0")/../n8n/exports"
mkdir -p "$EXPORT_DIR"

WORKFLOWS=$(curl -sf "${N8N_HOST%/}/rest/workflows" -H "X-N8N-API-KEY: $N8N_API_KEY")

echo "$WORKFLOWS" | jq -c '.data[]' | while read -r wf; do
  id=$(echo "$wf" | jq -r '.id')
  name=$(echo "$wf" | jq -r '.name' | tr ' ' '-' | tr -cd '[:alnum:]-_')
  curl -sf "${N8N_HOST%/}/rest/workflows/$id?format=file" -H "X-N8N-API-KEY: $N8N_API_KEY" > "$EXPORT_DIR/${name}-${id}.json"
  echo "Exported $name ($id)"
done
