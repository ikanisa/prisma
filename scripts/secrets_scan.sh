#!/usr/bin/env bash
# Run gitleaks to scan for secrets before commit
set -euo pipefail

CONFIG_FILE="$(dirname "$0")/../.gitleaks.toml"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not installed" >&2
  exit 1
fi

gitleaks detect --source . --config "$CONFIG_FILE" --no-git --no-banner
