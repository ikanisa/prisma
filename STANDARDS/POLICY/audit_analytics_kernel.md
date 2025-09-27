# ADA-1 Deterministic Analytics Kernel

## Purpose
Provide ISA 500/520 aligned deterministic analytics supporting journal entry risk scoring, ratio/variance analytics, duplicate detection, and Benford profiling. Outputs must include dataset lineage (hashes, references), parameters, exceptions, and activity log events for ATT evidence.

## Scope
- Journal entries sourced from GL/TB snapshots.
- Ratio/variance analytics for financial statement KPIs.
- Duplicate detection for reconciliations and transaction testing.
- Benford analysis for revenue/expense ledgers.
- Exceptions routed to sampling, JE testing, TCWG reporting, and Misstatements linkage.

## Controls & Workflow
1. **Input verification**
   - Require org/engagement/user context.
   - Capture dataset reference and deterministic hash.
   - Validate payload structure via Zod schemas.

2. **Run execution**
   - Persist `ada_runs` row with status timestamps.
   - Compute analytics via deterministic engine (no LLM involvement).
   - Insert exceptions with reason, score, disposition defaults.

3. **Activity logging**
   - Emit `ADA_RUN_STARTED`, `ADA_RUN_COMPLETED`, `ADA_EXCEPTION_ADDED`, `ADA_EXCEPTION_RESOLVED` events with metadata.

4. **Outputs**
   - Store summary JSON (parameters, totals, detail tables) on run row.
   - Maintain ATT evidence pack by exporting CSV (risk scores/metrics).
   - Provide UI controls for sampling hand-off and exception updates.

5. **Access & RLS**
   - RLS on `ada_runs`/`ada_exceptions` keyed by org.
   - Insert/update limited to EMPLOYEE+, delete restricted to MANAGER+.

6. **Exception handling**
   - Update disposition via API with optional misstatement link.
   - Require activity log entry when resolving exceptions.

## Acceptance Scenario
- Run JE analytics with sample ≥25 entries.
- Capture late postings, weekend entries, round amounts.
- Store dataset hash, parameters, totals, sample list.
- Exceptions surface in UI and support resolution workflow.

## References
- ISA 500, ISA 520, IAASB ATT Framework.
- Internal evidence standards `/STANDARDS/TRACEABILITY/matrix.md`.
