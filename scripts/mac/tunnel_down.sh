#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_DIR="$ROOT_DIR/infra/cloudflared"
PID_FILE="$CONFIG_DIR/cloudflared.pid"

stop_tunnel() {
  if [[ ! -f "$PID_FILE" ]]; then
    echo "No PID file found at $PID_FILE. The tunnel does not appear to be running."
    exit 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  if [[ -z "$pid" ]]; then
    echo "PID file at $PID_FILE is empty. Removing it." >&2
    rm -f "$PID_FILE"
    exit 0
  fi

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "No running cloudflared process found for PID $pid. Removing stale PID file." >&2
    rm -f "$PID_FILE"
    exit 0
  fi

  echo "Stopping cloudflared tunnel (PID $pid)..."
  kill "$pid"
  wait "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "cloudflared tunnel stopped."
}

stop_tunnel
