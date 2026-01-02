# Release Readiness Checklist

Generated: 2026-01-02T17:02:12Z

## Status Legend
- BLOCKED: P0 issue unresolved
- AT RISK: P1 issue unresolved
- READY: verified and complete

## Security & Access
- BLOCKED: Auth required on all API endpoints (FastAPI + Gateway)
- BLOCKED: Tenant isolation enforced for all Supabase access
- BLOCKED: Secret scanning clean; no real tokens in docs or scripts
- AT RISK: CORS restricted to approved origins

## Data Integrity (Accounting/Tax)
- AT RISK: Ledger constraints for debit/credit and batch balance
- AT RISK: Single source of truth for memberships and roles
- AT RISK: Tax rate data sources audited and versioned

## Reliability & Operations
- AT RISK: Rate limiting configured to fail-closed on Redis errors
- AT RISK: RAG service and Python API start without import errors
- READY: Health checks defined (verify endpoints and status codes)

## Testing & QA
- BLOCKED: Test suite runs cleanly (pnpm + pytest)
- AT RISK: E2E tests cover critical journeys
- AT RISK: Load tests executed for RAG and agent execution

## CI/CD & Deploy
- AT RISK: Build pipelines validated for all services
- AT RISK: Secrets managed via vault/CI secrets only
- READY: Deploy scripts and migrations reviewed
- BLOCKED: Migration dry-run in staging with schema diff captured and reviewed
- BLOCKED: Pre-migration backup + tested restore/rollback plan (PITR or snapshot)
- AT RISK: Production migration window + post-migration verification queries defined

## Observability
- AT RISK: Sentry/OTEL configured and verified in staging
- AT RISK: Audit logging verified for sensitive actions

## Documentation & Runbooks
- AT RISK: Runbook updated and validated by on-call
- READY: Environment variable guide maintained
