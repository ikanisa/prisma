#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$REPO_ROOT/.logs"
PID_FILE="$LOG_DIR/caddy.pid"
CADDY_CONFIG="$REPO_ROOT/infra/caddy/Caddyfile"

if ! command -v caddy >/dev/null 2>&1; then
  cat <<'MSG' >&2
Caddy is not installed or not available in your PATH.
Install it with "brew install caddy" or see https://caddyserver.com/docs/install for more options.
MSG
  exit 1
fi

stop_with_pid() {
  local pid="$1"
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "No running Caddy process found for PID $pid." >&2
    return 1
  fi

  echo "Stopping Caddy process $pid..."
  kill "$pid" 2>/dev/null || true

  for _ in {1..10}; do
    if kill -0 "$pid" 2>/dev/null; then
      sleep 0.5
    else
      echo "Caddy process $pid stopped."
      return 0
    fi
  done

  if kill -0 "$pid" 2>/dev/null; then
    echo "Caddy process $pid did not exit gracefully; sending SIGKILL." >&2
    kill -9 "$pid" 2>/dev/null || true
  fi

  if kill -0 "$pid" 2>/dev/null; then
    echo "Unable to terminate Caddy process $pid." >&2
    return 1
  fi

  echo "Caddy process $pid stopped."
  return 0
}

USED_PID_FILE=false
if [ -f "$PID_FILE" ]; then
  PID_CONTENT="$(cat "$PID_FILE")"
  if [[ "$PID_CONTENT" =~ ^[0-9]+$ ]]; then
    USED_PID_FILE=true
    if stop_with_pid "$PID_CONTENT"; then
      rm -f "$PID_FILE"
      exit 0
    else
      echo "Failed to stop Caddy using PID file. Falling back to pkill." >&2
    fi
  else
    echo "Invalid PID found in $PID_FILE: $PID_CONTENT" >&2
    rm -f "$PID_FILE"
  fi
fi

if pkill -f "caddy run --config $CADDY_CONFIG" 2>/dev/null; then
  echo "Terminated background Caddy processes matching $CADDY_CONFIG."
  [ "$USED_PID_FILE" = true ] && rm -f "$PID_FILE"
  exit 0
fi

if pkill caddy 2>/dev/null; then
  echo "Terminated remaining Caddy processes via pkill caddy."
  [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
  exit 0
fi

echo "No running Caddy processes found."
[ -f "$PID_FILE" ] && rm -f "$PID_FILE"
exit 0
