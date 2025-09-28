#!/usr/bin/env bash
set -euo pipefail

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is required. Install from https://k6.io/docs/getting-started/installation/" >&2
  exit 1
fi

if [ "$#" -lt 1 ]; then
  cat <<USAGE
Usage: $0 <scenario> [scenario...]

Scenarios:
  ada          -> tests/perf/ada-k6.js
  recon        -> tests/perf/recon-k6.js
  disclosure   -> tests/perf/disclosure-sync.js
  telemetry    -> tests/perf/telemetry-sync.js
  group        -> tests/perf/k6-group-audit.js

Environment variables honoured (see docs/performance-uat-plan.md):
  K6_BASE_URL, K6_ORG_ID, K6_ENG_ID, K6_ENTITY_ID, K6_USER_ID, ACCESS_TOKEN, etc.
  OUTPUT_DIR (default docs/PERF)

The script stores k6 summary exports as JSON under docs/PERF/<date>/<scenario>.json
USAGE
  exit 1
fi

output_root=${OUTPUT_DIR:-"docs/PERF"}
timestamp=$(date '+%Y-%m-%dT%H-%M-%S')
run_dir="$output_root/$timestamp"
mkdir -p "$run_dir"

function scenario_path() {
  case "$1" in
    ada) echo "tests/perf/ada-k6.js" ;;
    recon) echo "tests/perf/recon-k6.js" ;;
    disclosure) echo "tests/perf/disclosure-sync.js" ;;
    telemetry) echo "tests/perf/telemetry-sync.js" ;;
    group) echo "tests/perf/k6-group-audit.js" ;;
    *) echo "" ;;
  esac
}

for scenario in "$@"; do
  script_path=$(scenario_path "$scenario")
  if [ -z "$script_path" ]; then
    echo "Unknown scenario: $scenario" >&2
    exit 1
  fi

  output_file="$run_dir/${scenario}.json"
  echo "Running scenario '$scenario' -> $output_file"
  K6_SUMMARY_EXPORT="$output_file" k6 run "$script_path"
  echo
  echo "Summary stored in $output_file"
  echo
  sleep 2
  done

echo "All scenarios complete."
