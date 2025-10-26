#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROM_URL="http://kube-prometheus-stack-prometheus.monitoring:9090"
ALERTMANAGER_URL="http://kube-prometheus-stack-alertmanager.monitoring:9093"
SCENARIO=""
CONTEXT=""
EXPECT_ALERTS=()
OUTPUT_DIR="${ROOT_DIR}/test-results/chaos"

usage() {
  cat <<USAGE
Usage: $(basename "$0") --scenario <name> [options]

Options:
  --prom-url <url>           Prometheus base URL (default: ${PROM_URL})
  --alertmanager-url <url>   Alertmanager base URL (default: ${ALERTMANAGER_URL})
  --expect <AlertName>       Expect the named alert to fire (can be repeated)
  --context <name>           Kubernetes context (informational; surface in logs)
  -h, --help                 Show this help message
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scenario)
      SCENARIO="$2"
      shift 2
      ;;
    --prom-url)
      PROM_URL="$2"
      shift 2
      ;;
    --alertmanager-url)
      ALERTMANAGER_URL="$2"
      shift 2
      ;;
    --expect)
      EXPECT_ALERTS+=("$2")
      shift 2
      ;;
    --context)
      CONTEXT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$SCENARIO" ]]; then
  echo "--scenario is required" >&2
  usage
  exit 1
fi

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }

mkdir -p "$OUTPUT_DIR"

if [[ -n "$CONTEXT" ]]; then
  echo "[verify_slo_alerts] Using Kubernetes context: ${CONTEXT}" >&2
fi

echo "[verify_slo_alerts] Capturing SLO burn-rate for scenario ${SCENARIO}" >&2
curl -sS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=slo:api:availability:error_ratio:5m{chaos_scenario=\"${SCENARIO}\"}" \
  | jq '.' > "${OUTPUT_DIR}/${SCENARIO}-availability.json"

curl -sS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{chaos_scenario=\"${SCENARIO}\"}[5m])) by (le))" \
  | jq '.' > "${OUTPUT_DIR}/${SCENARIO}-latency.json"

if [[ ${#EXPECT_ALERTS[@]} -gt 0 ]]; then
  for alert in "${EXPECT_ALERTS[@]}"; do
    echo "[verify_slo_alerts] Waiting for alert ${alert}" >&2
    for attempt in {1..12}; do
      response="$(curl -sS "${ALERTMANAGER_URL}/api/v2/alerts?filter=alertname=${alert}")"
      if echo "$response" | jq -e ".[] | select(.labels.chaos_scenario == \"${SCENARIO}\" and .status.state == \"active\")" >/dev/null; then
        echo "[verify_slo_alerts] Alert ${alert} firing for scenario ${SCENARIO}" >&2
        echo "$response" | jq '.' > "${OUTPUT_DIR}/${SCENARIO}-${alert}.json"
        break
      fi
      sleep 10
      if [[ $attempt -eq 12 ]]; then
        echo "[verify_slo_alerts] Expected alert ${alert} did not fire" >&2
        exit 2
      fi
    done
  done
fi

echo "[verify_slo_alerts] Metrics written to ${OUTPUT_DIR}"
