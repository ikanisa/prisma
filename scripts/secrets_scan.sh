#!/usr/bin/env bash
# Secret scan wrapper (gitleaks)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${CONFIG_FILE:-"$ROOT_DIR/.gitleaks.toml"}"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "Error: gitleaks not installed" >&2
  exit 127
fi

# Pass any extra flags through with "$@"
exec gitleaks detect --source "$ROOT_DIR" --config "$CONFIG_FILE" --no-git --no-banner "$@"
