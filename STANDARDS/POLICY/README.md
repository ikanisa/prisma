# Accounting Automation Policies

This directory captures the operating playbooks for the advanced accounting workspace. Each module pairs a Supabase schema, protected APIs and workspace components to enforce approvals, segregation of duties and telemetry. Refer to the topic-specific guides for sequencing, data requirements and escalation rules.

## Modules

1. Group consolidation
2. Revenue contract orchestration
3. Lease measurement engine
4. Financial instruments and expected credit loss (ECL)
5. Impairment testing
6. Income tax packs
7. Cash flow builder
8. Disclosure composer
9. ESEF / iXBRL exporter
10. Basis switcher (IFRS ↔ GAPSME)
11. Industry toggles
12. Specialised industry packs
13. Governance telemetry

Each guide documents:

- **Data capture** – mandatory payload elements expected by the `/api/accounting/*` endpoints.
- **Approval matrix** – roles required to advance from draft to ready state.
- **Traceability** – Supabase tables and audit hooks storing module history.
- **Acceptance tests** – coverage implemented in `tests/accounting/`.
