# Chaos Engineering Toolkit

This directory contains the manifests and monitoring assets required to run
chaos engineering experiments against the Prisma stack. The configuration uses
[Chaos Mesh](https://chaos-mesh.org/) to orchestrate experiments and integrates
with the platform's observability stack so that SLO regressions and alerting
rules can be validated while faults are injected.

## Layout

- `chaos-mesh/` – Namespace, RBAC, and experiment manifests for Chaos Mesh.
- `monitoring/` – Prometheus alerting rules tuned for chaos runs and SLO
  validation.
- `../scripts/chaos/` – Helper scripts to schedule experiments and validate
  SLO/alert behaviour from a developer workstation or CI runner.

See the individual `README` files for instructions on how to apply the
manifests and run the experiments.
