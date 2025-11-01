#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/audit"
DETECT_CMD="${DETECT_SECRETS_CMD:-detect-secrets}"
TARGETS=(src apps services packages server gateway)

if ! command -v "${DETECT_CMD}" >/dev/null 2>&1; then
  echo "\033[31merror:\033[0m '${DETECT_CMD}' command not found. Install 'detect-secrets' (e.g. 'pip install detect-secrets') or set DETECT_SECRETS_CMD." >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

cd "${ROOT_DIR}"

SELECTED=()
for target in "${TARGETS[@]}"; do
  if [ -d "${target}" ]; then
    SELECTED+=("${target}")
  fi
done

if [ ${#SELECTED[@]} -eq 0 ]; then
  echo "\033[33mwarning:\033[0m no target directories found for detect-secrets." >&2
  exit 0
fi

"${DETECT_CMD}" scan \
  --exclude-files '(^|/)(node_modules|.git|.turbo|dist|build|coverage|.next|.vercel|.pnpm-store|audit|.cache|tmp|test-results)/' \
  "${SELECTED[@]}" > "${OUTPUT_DIR}/detect-secrets.baseline"

echo "detect-secrets baseline written to ${OUTPUT_DIR}/detect-secrets.baseline"
