#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$REPO_ROOT/.logs"
PID_FILE="$LOG_DIR/caddy.pid"
LOG_FILE="$LOG_DIR/caddy.log"
CADDY_CONFIG="$REPO_ROOT/infra/caddy/Caddyfile"

if ! command -v caddy >/dev/null 2>&1; then
  cat <<'MSG' >&2
Caddy is not installed or not available in your PATH.
Install it with "brew install caddy" or see https://caddyserver.com/docs/install for more options.
MSG
  exit 1
fi

CADDY_BIN="$(command -v caddy)"

if [ ! -f "$CADDY_CONFIG" ]; then
  echo "Caddy configuration not found at $CADDY_CONFIG" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Caddy already running in background with PID $EXISTING_PID (per $PID_FILE)." >&2
    exit 0
  else
    echo "Removing stale PID file at $PID_FILE." >&2
    rm -f "$PID_FILE"
  fi
fi

nohup "$CADDY_BIN" run --config "$CADDY_CONFIG" --adapter caddyfile >> "$LOG_FILE" 2>&1 &
CADDY_PID=$!

echo "$CADDY_PID" > "$PID_FILE"

disown "$CADDY_PID" 2>/dev/null || true

echo "Caddy started in background (PID $CADDY_PID). Logs: $LOG_FILE"
