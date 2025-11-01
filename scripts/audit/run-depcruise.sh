#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/audit"
TARGET_DIR="src"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "\033[31merror:\033[0m 'pnpm' command not found." >&2
  exit 1
fi

if ! pnpm exec dependency-cruiser --version >/dev/null 2>&1; then
  if ! pnpm exec depcruise --version >/dev/null 2>&1; then
    echo "\033[31merror:\033[0m 'dependency-cruiser' (depcruise) command not available. Install it with 'pnpm add -D dependency-cruiser'." >&2
    exit 1
  fi
fi

mkdir -p "${OUTPUT_DIR}"

cd "${ROOT_DIR}"

if [ ! -d "${TARGET_DIR}" ]; then
  echo "\033[33mwarning:\033[0m target directory '${TARGET_DIR}' not found; skipping dependency analysis." >&2
  exit 0
fi

pnpm exec depcruise --no-config --output-type json --progress none --max-depth 5 \
  --exclude "^node_modules" --exclude "^dist" --exclude "^build" \
  --include-only "^src" \
  "${TARGET_DIR}" > "${OUTPUT_DIR}/deps.json"

echo "Dependency cruiser report written to ${OUTPUT_DIR}/deps.json"
