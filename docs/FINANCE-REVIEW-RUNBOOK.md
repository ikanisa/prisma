# Finance Review System - Operations Runbook

## Overview

The Finance Review System provides automated dual-agent (CFO + Auditor) financial review for IKANISA/MoMo gateway operations. It combines:

- **CFO Agent**: Daily close validation, float reconciliation, and proposed adjusting entries
- **Auditor Agent**: Independent challenge, tax compliance, and risk assessment
- **RAG**: Semantic search over ledger entries and supporting documents
- **APIs**: REST endpoints for review execution and compliance checks

## Architecture

### Components

1. **Database Tables** (Supabase/PostgreSQL + pgvector)
   - `ledger_entries`: General ledger transactions
   - `support_docs`: Supporting documentation with OCR text
   - `tax_maps`: Tax treatment rules by account/jurisdiction
   - `controls_logs`: Audit trail of review executions
   - `embeddings`: Vector embeddings for semantic search

2. **Core Libraries** (`src/lib/finance-review/`)
   - `env.ts`: Environment configuration
   - `supabase.ts`: Database clients (anon + admin)
   - `embeddings.ts`: OpenAI embedding generation
   - `retrieval.ts`: Hybrid vector + SQL search
   - `ledger.ts`: Ledger query utilities

3. **Agent Prompts** (`src/agents/finance-review/`)
   - `cfo.ts`: CFO agent system prompt and response schema
   - `auditor.ts`: Auditor agent system prompt and response schema

4. **API Routes** (`apps/web/app/api/review/`)
   - `run/`: Execute dual-agent review
   - `missing-docs/`: Find entries without supporting docs
   - `tax-risk/`: Identify accounts missing tax mappings
   - `float-breaks/`: Reconcile SACCO float vs MoMo settlement

5. **CLI** (`scripts/finance-review/`)
   - `run-daily-review.ts`: Manual/cron execution wrapper

## Setup & Configuration

### Prerequisites

1. **Supabase Project**: PostgreSQL database with pgvector extension enabled
2. **OpenAI API Key**: For embeddings (text-embedding-3-small) and chat (gpt-4o-mini)
3. **Environment Variables**: Configure in `.env` or secrets manager

### Required Environment Variables

```bash
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
SUPABASE_ANON_KEY=<ANON_KEY>

# OpenAI (required)
OPENAI_API_KEY=sk-your-key

# Models (optional, defaults shown)
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini

# Testing/Dev (optional)
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000000
```

### Database Setup

1. **Apply Schema**:
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/seed_finance_review.sql
   ```

2. **Apply RLS Policies**:
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/policies_finance_review.sql
   ```

3. **Verify Installation**:
   ```sql
   -- Check tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('ledger_entries', 'support_docs', 'tax_maps', 'controls_logs', 'embeddings');
   
   -- Check RPC function
   SELECT routine_name FROM information_schema.routines WHERE routine_name = 'match_embeddings';
   ```

## Operations

### Daily Review Workflow

#### 1. Manual Execution

Run the daily review CLI script:

```bash
# Default organization, last 24 hours
tsx scripts/finance-review/run-daily-review.ts

# Specific organization, custom period
tsx scripts/finance-review/run-daily-review.ts --org-id=abc123 --hours=48
```

#### 2. Cron Scheduling

Add to crontab for automated execution:

```bash
# Run at 6 AM daily (after settlement batch completes)
0 6 * * * cd /path/to/app && tsx scripts/finance-review/run-daily-review.ts >> /var/log/finance-review.log 2>&1
```

#### 3. API Invocation

Call via HTTP API for integration with dashboards:

```bash
curl -X POST http://localhost:3000/api/review/run \
  -H "Content-Type: application/json" \
  -d '{"orgId": "abc123", "hours": 24}'
```

### Playbook: Common Scenarios

#### Scenario 1: Missing Documentation

**Symptom**: CFO agent flags `missing_doc` issues

**Actions**:
1. Query missing docs endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/review/missing-docs \
     -H "Content-Type: application/json" \
     -d '{"orgId": "abc123", "days": 30}'
   ```

2. Review output and collect missing documents (invoices, receipts, bank statements)

3. Upload to `support_docs` table with matching `source_txn_id`

4. Re-run review to verify resolution

#### Scenario 2: Tax Mapping Gaps

**Symptom**: CFO or Auditor agent flags `tax_map_gap`

**Actions**:
1. Query tax risk endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/review/tax-risk \
     -H "Content-Type: application/json" \
     -d '{"orgId": "abc123"}'
   ```

2. Review unmapped accounts

3. Add entries to `tax_maps` table:
   ```sql
   INSERT INTO tax_maps (org_id, account, jurisdiction, treatment, vat_rate, notes)
   VALUES ('abc123', 'MOBILE_REVENUE', 'KE', 'Standard rated', 16.00, 'Digital services VAT');
   ```

4. Re-run review

#### Scenario 3: Float Reconciliation Break

**Symptom**: Float balance doesn't match settlement balance

**Actions**:
1. Query float breaks endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/review/float-breaks \
     -H "Content-Type: application/json" \
     -d '{"orgId": "abc123"}'
   ```

2. Investigate difference:
   - Check for settlement timing delays (T+1, T+2)
   - Review unsettled transactions in MoMo gateway
   - Validate SACCO float control account postings

3. Post adjusting entry if timing difference confirmed:
   ```sql
   INSERT INTO ledger_entries (org_id, date, account, debit, credit, currency, memo)
   VALUES ('abc123', '2024-01-15', 'SETTLEMENT_IN_TRANSIT', 5000.00, NULL, 'KES', 'Timing adjustment per daily review'),
          ('abc123', '2024-01-15', 'SACCO_FLOAT_CONTROL', NULL, 5000.00, 'KES', 'Timing adjustment per daily review');
   ```

4. Re-run review to confirm reconciliation

## Security & Access Control

### Row-Level Security (RLS)

All finance review tables enforce multi-tenant isolation via RLS:

```sql
-- Users can only access data for their organization
WHERE org_id = current_org()
```

The `current_org()` function extracts `org_id` from JWT claims.

### Service Role vs Anon Key

- **Anon Key** (`supabaseAnon`): Client-side operations, RLS-enabled
  - Use for: User-initiated queries, dashboard displays
  
- **Service Role Key** (`supabaseAdmin`): Server-side operations, bypasses RLS
  - Use for: Bulk imports, embedding generation, cross-org admin tasks
  - **CRITICAL**: Never expose service role key on client

### Best Practices

1. ✅ Run all agent reviews server-side with service role
2. ✅ Use anon key for client-side queries (RLS enforces isolation)
3. ✅ Store service role key in secrets manager, not `.env` in repo
4. ✅ Audit `controls_logs` for all review executions
5. ❌ Never pass service role key to browser/client
6. ❌ Don't hard-code organization IDs in prompts

## Monitoring & Observability

### Key Metrics

1. **Review Execution**
   - Frequency: Daily (or per configured schedule)
   - Success rate: >99% (failures alert via webhook)
   - Latency: <30s p95 (OpenAI API + DB)

2. **Vector Search Performance**
   - Recall: >90% for similarity >= 0.7
   - Latency: <150ms p95
   - Index health: Monitor IVFFlat list count vs row count

3. **Agent Output Quality**
   - JSON parse success: 100% (fail closed on malformed output)
   - Issue detection rate: Baseline per org (track over time)
   - False positive rate: <5% (manual validation sample)

### Logging

Review outputs are stored in `controls_logs`:

```sql
SELECT created_at, status, details->>'cfo'->'summary', details->>'auditor'->'risk_level'
FROM controls_logs
WHERE control_key = 'daily_review' AND org_id = 'abc123'
ORDER BY created_at DESC
LIMIT 10;
```

### Alerting

Recommended alerts:

1. **RED Status**: Critical issues found, manual review required
   - Trigger: `status = 'RED'` in `/api/review/run` response
   - Action: Page on-call CFO/Controller

2. **API Failures**: Review execution failed
   - Trigger: HTTP 500 from `/api/review/run`
   - Action: Alert engineering

3. **Embedding Lag**: Vector index out of date
   - Trigger: No embeddings generated in 24h
   - Action: Check embedding pipeline

## Troubleshooting

### Issue: "OpenAI API rate limit exceeded"

**Cause**: Too many concurrent embedding or chat requests

**Solution**:
1. Check OpenAI API usage dashboard
2. Reduce `match_count` in retrieval calls
3. Implement exponential backoff retry
4. Upgrade OpenAI tier if consistently hitting limits

### Issue: "Vector search returns no results"

**Cause**: Embeddings not generated or index not built

**Solution**:
1. Check embeddings table: `SELECT COUNT(*) FROM embeddings WHERE org_id = 'abc123';`
2. Generate embeddings for existing data:
   ```typescript
   import { upsertEmbedding } from './src/lib/finance-review/embeddings';
   // For each ledger entry or document, call upsertEmbedding
   ```
3. Verify IVFFlat index exists: `\d embeddings` in psql

### Issue: "RLS policy denies cross-org access"

**Cause**: Correct behavior - RLS is working

**Action**: Ensure JWT contains correct `org_id` claim

### Issue: "Agent output is not valid JSON"

**Cause**: OpenAI model returned prose instead of structured JSON

**Solution**:
1. Check prompt includes "Return ONLY valid JSON"
2. Use `response_format: { type: 'json_object' }` in API call (already implemented)
3. Add retry logic with explicit JSON format instruction

## Maintenance

### Weekly

- [ ] Review `controls_logs` for trends in issues/exceptions
- [ ] Sample agent outputs for quality assurance
- [ ] Monitor vector search latency

### Monthly

- [ ] Audit RLS policy effectiveness (test cross-org isolation)
- [ ] Review tax maps for new accounts
- [ ] Validate float reconciliation accuracy
- [ ] Update embeddings for changed documents

### Quarterly

- [ ] Upgrade OpenAI models if new versions released
- [ ] Tune IVFFlat index list count based on data growth
- [ ] Review and refresh agent prompts based on CFO/Auditor feedback

## Appendix

### Table Schemas

See `supabase/seed_finance_review.sql` for full schema definitions.

### API Reference

See `apps/web/app/api/review/*/route.ts` for detailed API specs.

### Agent Prompts

See `src/agents/finance-review/cfo.ts` and `auditor.ts` for full prompts.

### Support

For issues or questions:
- GitHub Issues: https://github.com/ikanisa/prisma/issues
- Slack: #finance-review-support
