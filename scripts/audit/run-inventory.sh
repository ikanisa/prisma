#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/generate-tree.sh"
"${SCRIPT_DIR}/run-depcruise.sh"
"${SCRIPT_DIR}/run-detect-secrets.sh"

echo "Audit inventory complete. Outputs are available in the audit/ directory."
