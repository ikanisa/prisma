#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MANIFEST="${ROOT_DIR}/infra/chaos/chaos-mesh/experiments/network-latency.yaml"
CONTEXT=""
DURATION_OVERRIDE=""

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--context <name>] [--duration <10m>]

Injects latency between the API and GraphQL workloads. The script relies on the
Prometheus rules under `infra/chaos/monitoring` to assert the latency alert
fires and resolves.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --context)
      CONTEXT="$2"
      shift 2
      ;;
    --duration)
      DURATION_OVERRIDE="$2"
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

command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required" >&2; exit 1; }

kubectl_cmd=(kubectl)
if [[ -n "$CONTEXT" ]]; then
  kubectl_cmd+=(--context "$CONTEXT")
fi

"${kubectl_cmd[@]}" apply -f "$MANIFEST"

if [[ -n "$DURATION_OVERRIDE" ]]; then
  "${kubectl_cmd[@]}" patch networkchaos inject-latency-api \
    --namespace chaos-testing \
    --type merge \
    --patch "{\"spec\":{\"duration\":\"${DURATION_OVERRIDE}\"}}"
fi

"${kubectl_cmd[@]}" label pods \
  --namespace control-plane \
  -l app.kubernetes.io/component=api \
  chaos_scenario=network-latency --overwrite

"${SCRIPT_DIR}/verify_slo_alerts.sh" --scenario network-latency \
  ${CONTEXT:+--context ${CONTEXT}} \
  --expect ApiLatencyBudgetExhausted
