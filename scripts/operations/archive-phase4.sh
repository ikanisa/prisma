#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR=${1:-archives}
SUFFIX=${2:-$(date '+%Y%m%d-%H%M%S')}
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
OUTPUT_PATH="$ROOT_DIR/$OUTPUT_DIR/phase4-evidence-$SUFFIX.tar.gz"

mkdir -p "$(dirname "$OUTPUT_PATH")"

# Collect directories if they exist
collect() {
  local path=$1
  if [ -d "$ROOT_DIR/$path" ]; then
    printf '%s\n' "$path"
  fi
}

MAPFILE -t sources < <(
  collect docs/PERF
  collect docs/SECURITY/evidence
  collect docs/PHASE4
  collect docs/UAT
  collect scripts/perf
)

if [ ${#sources[@]} -eq 0 ]; then
  echo "No Phase 4 artefacts found to archive." >&2
  exit 1
fi

(
  cd "$ROOT_DIR"
  tar -czf "$OUTPUT_PATH" "${sources[@]}"
)

echo "Phase 4 artefacts archived to $OUTPUT_PATH"
