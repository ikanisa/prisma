#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="GO-LIVE/artifacts"
mkdir -p "$ARTIFACT_DIR"

BASE_URL=${AUTOPILOT_BASE_URL:-"http://localhost:3001"}
TOKEN=${AUTOPILOT_ACCESS_TOKEN:-""}
ORG_SLUG=${AUTOPILOT_ORG_SLUG:-"demo"}
VUS=${AUTOPILOT_VUS:-"5"}
DURATION=${AUTOPILOT_DURATION:-"1m"}
SUMMARY_PATH="$ARTIFACT_DIR/autopilot-smoke-summary.json"

if ! command -v k6 > /dev/null; then
  echo "k6 binary is required to run this script" >&2
  exit 1
fi

AUTOPILOT_BASE_URL="$BASE_URL" \
AUTOPILOT_ACCESS_TOKEN="$TOKEN" \
AUTOPILOT_ORG_SLUG="$ORG_SLUG" \
AUTOPILOT_VUS="$VUS" \
AUTOPILOT_DURATION="$DURATION" \
k6 run --summary-export "$SUMMARY_PATH" tests/perf/autopilot-smoke.js

echo "Autopilot smoke summary written to $SUMMARY_PATH"
