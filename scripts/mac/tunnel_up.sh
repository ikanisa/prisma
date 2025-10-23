#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_DIR="$ROOT_DIR/infra/cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"

require_cloudflared() {
  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "cloudflared is required but not installed. Install it via \"brew install cloudflared\"." >&2
    exit 1
  fi
}

ensure_config() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Missing $CONFIG_FILE. Copy config.yml.example to config.yml and configure your tunnel." >&2
    exit 1
  fi
}

require_cloudflared
ensure_config

cd "$CONFIG_DIR"
echo "Starting Cloudflare tunnel in the foreground..."
exec cloudflared --config "$CONFIG_FILE" tunnel run
