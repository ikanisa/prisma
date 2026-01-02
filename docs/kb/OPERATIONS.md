# Knowledge Factory Operations Runbook

## Overview

This runbook covers operational procedures for the Knowledge Factory pipeline.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm kb:sync --org-id=<uuid>` | Process new/changed files |
| `pnpm kb:backfill --org-id=<uuid>` | Full reprocess |
| `pnpm kb:reindex --document-id=<uuid>` | Rebuild embeddings |
| `pnpm kb:verify --org-id=<uuid>` | Check access controls |

---

## Routine Operations

### Daily Sync

```bash
# Sync all active sources
pnpm kb:sync --org-id=<org-uuid>

# Check run status
supabase functions logs kb-sync --tail
```

### Weekly Backfill Check

```bash
# Dry run to see what would be processed
pnpm kb:backfill --org-id=<org-uuid> --dry-run

# Check for failed documents
psql -c "SELECT name, error_message FROM kb_documents WHERE status = 'FAILED' AND tenant_id = '<org-uuid>'"
```

---

## Troubleshooting

### Document Stuck in EXTRACTING

**Symptoms:** Document status remains EXTRACTING for > 10 minutes

**Steps:**
1. Check logs for extraction errors
2. Verify file is accessible in Drive
3. Force retry:
```bash
psql -c "UPDATE kb_documents SET status = 'NEW', retry_count = retry_count + 1 WHERE id = '<doc-uuid>'"
pnpm kb:sync --org-id=<org-uuid>
```

### Embedding Generation Failures

**Symptoms:** OpenAI API rate limit errors

**Steps:**
1. Check rate limit status
2. Reduce concurrency:
```bash
pnpm kb:reindex --org-id=<uuid> --max-concurrent=1
```
3. Wait for rate limit reset (usually 60 seconds)

### Vector Search Returns No Results

**Symptoms:** KB search returns empty results

**Steps:**
1. Verify embeddings exist:
```sql
SELECT COUNT(*) FROM kb_embeddings WHERE tenant_id = '<org-uuid>';
```

2. Check document status:
```sql
SELECT status, COUNT(*) FROM kb_documents 
WHERE tenant_id = '<org-uuid>' 
GROUP BY status;
```

3. Test direct similarity:
```sql
SELECT * FROM kb_search('<org-uuid>', '<embedding-vector>', 10);
```

---

## Recovery Procedures

### Full Reindex

Use when embeddings are corrupted or model changed:

```bash
# 1. Delete existing embeddings
psql -c "DELETE FROM kb_embeddings WHERE tenant_id = '<org-uuid>'"

# 2. Regenerate all
pnpm kb:reindex --org-id=<org-uuid>
```

### Reprocess Failed Documents

```bash
# Reset failed documents
psql -c "UPDATE kb_documents SET status = 'NEW', error_message = NULL WHERE status = 'FAILED' AND tenant_id = '<org-uuid>'"

# Reprocess
pnpm kb:backfill --org-id=<org-uuid>
```

### Rollback Bad Enrichment

If classification was incorrect:

```sql
-- Delete tags and summaries for a document
DELETE FROM kb_tags WHERE document_id = '<doc-uuid>';
DELETE FROM kb_summaries WHERE document_id = '<doc-uuid>';

-- Reset document status
UPDATE kb_documents SET status = 'EXTRACTED' WHERE id = '<doc-uuid>';
```

---

## Monitoring

### Key Metrics

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Docs in FAILED status | < 5% | 5-15% | > 15% |
| Avg embedding latency | < 500ms | 500-2000ms | > 2000ms |
| Sync run duration | < 5min | 5-15min | > 15min |

### Health Queries

```sql
-- Document status distribution
SELECT status, COUNT(*), 
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as pct
FROM kb_documents 
WHERE tenant_id = '<org-uuid>'
GROUP BY status;

-- Recent runs
SELECT id, run_type, status, 
       started_at, finished_at,
       stats
FROM kb_runs 
WHERE tenant_id = '<org-uuid>'
ORDER BY created_at DESC 
LIMIT 10;

-- Chunk distribution
SELECT d.name, COUNT(c.id) as chunks
FROM kb_documents d
LEFT JOIN kb_chunks c ON c.document_id = d.id
WHERE d.tenant_id = '<org-uuid>'
GROUP BY d.name
ORDER BY chunks DESC
LIMIT 10;
```

---

## Security Procedures

### Audit Trail Review

```sql
-- Recent queries
SELECT user_id, query, 
       jsonb_array_length(retrieved_chunk_ids) as chunks_retrieved,
       created_at
FROM kb_audit_trail
WHERE tenant_id = '<org-uuid>'
ORDER BY created_at DESC
LIMIT 50;

-- Restricted document access
SELECT at.user_id, d.name, at.created_at
FROM kb_audit_trail at
JOIN kb_documents d ON d.id = ANY(
  SELECT jsonb_array_elements_text(at.retrieved_document_ids)::uuid
)
WHERE d.confidentiality = 'RESTRICTED'
ORDER BY at.created_at DESC;
```

### Access Control Verification

```bash
# Verify role-based access
pnpm kb:verify --org-id=<uuid> --user-role=EMPLOYEE
pnpm kb:verify --org-id=<uuid> --user-role=MANAGER
```

---

## Alerts

### Recommended Alert Rules

1. **Failed Run Alert**
   - Trigger: kb_runs.status = 'FAILED'
   - Severity: Warning
   - Action: Investigate and retry

2. **High Failure Rate**
   - Trigger: > 10% docs in FAILED status
   - Severity: Critical
   - Action: Check extraction/enrichment errors

3. **Stale Sync**
   - Trigger: No successful sync in 24 hours
   - Severity: Warning
   - Action: Check connector status

---

## Contacts

| Role | Contact |
|------|---------|
| KB Pipeline Owner | [team] |
| Platform On-Call | [oncall] |
| Security Team | [security] |
