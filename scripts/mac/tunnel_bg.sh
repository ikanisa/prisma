#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_DIR="$ROOT_DIR/infra/cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"
PID_FILE="$CONFIG_DIR/cloudflared.pid"
LOG_FILE="$CONFIG_DIR/cloudflared.log"

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

ensure_not_running() {
  if [[ -f "$PID_FILE" ]]; then
    local existing_pid
    existing_pid="$(cat "$PID_FILE")"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" >/dev/null 2>&1; then
      echo "cloudflared tunnel is already running with PID $existing_pid (see $LOG_FILE)." >&2
      exit 0
    fi
    echo "Removing stale PID file at $PID_FILE." >&2
    rm -f "$PID_FILE"
  fi
}

require_cloudflared
ensure_config
ensure_not_running

mkdir -p "$CONFIG_DIR"
touch "$LOG_FILE"

cd "$CONFIG_DIR"
echo "Starting Cloudflare tunnel in the background..."
cloudflared --config "$CONFIG_FILE" tunnel run >>"$LOG_FILE" 2>&1 &
cloudflared_pid=$!
echo "$cloudflared_pid" > "$PID_FILE"
echo "cloudflared started with PID $cloudflared_pid. Logs: $LOG_FILE"
