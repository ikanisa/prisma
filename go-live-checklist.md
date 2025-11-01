# Go-Live Checklist

## Governance
- [ ] Executive approval for launch scope and risk acceptance
- [ ] Branch protection rules enforced on `main`
- [ ] CODEOWNERS entries validated for all critical paths

## Security & Privacy
- [ ] Secrets sourced from managed vault; `.env.example` updated
- [ ] CodeQL, ZAP, dependency scans passing in CI
- [ ] Security review sign-off logged in `SECURITY.md`
- [ ] Data retention and erasure playbooks validated

## Data Integrity
- [ ] Money/Decimal primitives and journal invariants enforced
- [ ] Ledger backfill dry-run completed in staging
- [ ] Audit trail immutability verified with append-only tests

## PWA Readiness
- [ ] Lighthouse CI scores meet thresholds (Perf ≥90, A11y ≥95, BP ≥95, SEO ≥90)
- [ ] Web manifest and service worker validated for installability
- [ ] Offline sync conflict tests pass for Staff and Admin flows

## Observability & Operations
- [ ] OpenTelemetry traces flowing to observability backend
- [ ] Dashboard and alerts reviewed with on-call rotation
- [ ] RUNBOOK drills completed; pager escalation tested

## Release Engineering
- [ ] Release candidate tag (`RC_TAG`) created
- [ ] Canary deployment verified with smoke tests
- [ ] Rollback plan rehearsed and documented in `RUNBOOK.md`

## Compliance
- [ ] SOC 2 evidence package assembled
- [ ] GDPR Subject Rights workflow tested end-to-end
- [ ] Financial reporting sign-off per IFRS/GAAP
