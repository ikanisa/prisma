# Runbooks and Automation

This directory contains operational runbooks and their supporting automation
scripts. Each runbook describes the steps required to restore service for a
specific failure mode and references automation hooks that can be executed
on-demand or during quarterly simulations.

## Structure

- `*.yaml` &mdash; Human-readable runbook definitions that include metadata,
  remediation steps, and automation configuration.
- `automation/` &mdash; TypeScript helpers that orchestrate calls to PagerDuty and
  FireHydrant using the secrets defined under `config/secrets`.

## Secrets

Automation depends on API tokens that **must never be committed**. Store them
in `config/secrets` using the following templates:

- `config/secrets/pagerduty.json`
- `config/secrets/firehydrant.json`

Example files with placeholder values are provided in the repository to make it
safe to run simulations and automated tests.

## Quarterly Reviews

The helper in `automation/incident-integrations.ts` exposes a
`simulateQuarterlyReview` function that loads a runbook, validates that its
review cadence is quarterly, and performs a dry-run of all configured automation
hooks. This simulation is exercised by the test suite to guarantee that the
runbook remains executable on a quarterly basis.
