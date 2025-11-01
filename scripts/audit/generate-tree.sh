#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/audit"
TREE_CMD="${TREE_CMD:-tree}"

if ! command -v "${TREE_CMD}" >/dev/null 2>&1; then
  echo "\033[31merror:\033[0m '${TREE_CMD}' command not found. Install 'tree' or set TREE_CMD to an equivalent." >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

cd "${ROOT_DIR}"
"${TREE_CMD}" -a -I 'node_modules|.git|.turbo|dist|build|coverage|.next|.vercel' > "${OUTPUT_DIR}/repo-tree.txt"

echo "Repository tree written to ${OUTPUT_DIR}/repo-tree.txt"
