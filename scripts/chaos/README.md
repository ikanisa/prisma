# Chaos experiment scripts

These scripts orchestrate Chaos Mesh experiments and collect SLO metrics for
post-mortem analysis. They assume `kubectl`, `jq`, and `curl` are available and
that you have cluster-admin access to the target environment.

## Available scripts

- `run_db_throttle.sh` – Applies the PostgreSQL bandwidth experiment and tags
  active pods with the `chaos_scenario=db-throttle` label for observability.
- `run_network_latency.sh` – Injects latency between the API and GraphQL pods
  and verifies the SLO alert rules fire.
- `run_pod_kill.sh` – Randomly terminates API gateway pods, asserting they
  recover within the configured SLO.
- `verify_slo_alerts.sh` – Helper to query Prometheus/Alertmanager to ensure SLO
  alerts are raised during experiments and cleared afterwards.

Each script accepts a `--context` flag to switch between Kubernetes contexts and
an optional `--duration` flag when the experiment definition allows overriding
the default runtime.
