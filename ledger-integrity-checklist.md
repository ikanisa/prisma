# Ledger Integrity Checklist

## Data Modeling
- [ ] Money amounts represented with Decimal/Minor Units (no floating point)
- [ ] JournalEntry schema enforces balanced debits/credits per transaction
- [ ] LedgerAccount metadata captures currency, jurisdiction, and posting rules
- [ ] TaxRule definitions versioned with effective dates and jurisdiction scope

## Application Logic
- [ ] Invariant tests cover posting, adjustments, and reversals
- [ ] Idempotency keys required for POST/PUT mutations affecting financial state
- [ ] AuditTrailEvent includes actor, trace_id, and immutable payload hash
- [ ] Background jobs idempotent and replay-safe (BullMQ dedupe keys)

## Database & Storage
- [ ] Postgres constraints enforce foreign keys and check constraints on balances
- [ ] Append-only ledger tables with archival strategy defined
- [ ] Indexes validated for high-volume queries (account, period, tenant)
- [ ] Backup/restore drills executed and logged

## Monitoring & Reporting
- [ ] Reconciliation jobs emit metrics (RED: rate, errors, duration)
- [ ] Evidence exports signed and stored with integrity proofs
- [ ] Variance reports reviewed and signed off by finance owner
