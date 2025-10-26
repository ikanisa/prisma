#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MANIFEST="${ROOT_DIR}/infra/chaos/chaos-mesh/experiments/pod-kill.yaml"
CONTEXT=""

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--context <name>]

Kills a percentage of API gateway pods to validate readiness probes, HPA
behaviour, and alert routing. Pair this with the SLO verification script to
confirm coverage.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
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

command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required" >&2; exit 1; }

kubectl_cmd=(kubectl)
if [[ -n "$CONTEXT" ]]; then
  kubectl_cmd+=(--context "$CONTEXT")
fi

"${kubectl_cmd[@]}" apply -f "$MANIFEST"

"${kubectl_cmd[@]}" label pods \
  --namespace control-plane \
  -l app.kubernetes.io/name=gateway \
  chaos_scenario=pod-kill --overwrite

"${SCRIPT_DIR}/verify_slo_alerts.sh" --scenario pod-kill \
  ${CONTEXT:+--context ${CONTEXT}} \
  --expect ApiAvailabilityErrorBudgetBurn
