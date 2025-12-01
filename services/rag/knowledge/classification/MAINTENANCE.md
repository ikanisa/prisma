# Maintenance Guide - Web Source Auto-Classification

## Routine Maintenance Tasks

### Daily Tasks

#### 1. Monitor Classification Quality
```bash
# Generate daily report
pnpm tsx scripts/generate-classification-report.ts --format=markdown

# Check low-confidence sources
grep "confidence.*[0-4][0-9]%" classification-report-*.md
```

#### 2. Review Auto-Classified Sources
```sql
-- Check today's auto-classifications
SELECT name, base_url, classification_confidence, classification_source
FROM deep_search_sources
WHERE auto_classified = true
  AND created_at >= CURRENT_DATE
ORDER BY classification_confidence ASC;
```

### Weekly Tasks

#### 1. Update Domain Rules
```bash
# List unknown categories
pnpm tsx scripts/manage-domain-rules.ts test

# Add new rules for frequently appearing domains
pnpm tsx scripts/manage-domain-rules.ts add
```

#### 2. Audit Low-Confidence Classifications
```sql
-- Sources with confidence < 50%
SELECT id, name, base_url, classification_confidence
FROM deep_search_sources
WHERE classification_confidence < 50
  AND auto_classified = true
ORDER BY classification_confidence ASC
LIMIT 20;
```

Review and either:
- Add domain rules for better accuracy
- Reclassify with LLM
- Manually update

#### 3. Check LLM Usage & Costs
```sql
-- Count LLM classifications this week
SELECT 
  COUNT(*) as llm_count,
  AVG(classification_confidence) as avg_confidence
FROM deep_search_sources
WHERE classification_source IN ('LLM', 'MIXED')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';
```

Estimated cost: `llm_count * $0.001`

### Monthly Tasks

#### 1. Comprehensive Audit
```bash
# Generate full report
pnpm tsx scripts/generate-classification-report.ts --format=markdown
pnpm tsx scripts/generate-classification-report.ts --format=csv

# Archive reports
mkdir -p reports/$(date +%Y-%m)
mv classification-report-*.md reports/$(date +%Y-%m)/
```

#### 2. Rule Optimization
```bash
# Export current rules
pnpm tsx scripts/manage-domain-rules.ts export > rules-backup-$(date +%Y%m%d).json

# Analyze rule coverage
# (manual review of domains not in rules)
```

#### 3. Performance Review
```sql
-- Classification method distribution
SELECT 
  classification_source,
  COUNT(*) as count,
  AVG(classification_confidence) as avg_confidence,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM deep_search_sources
WHERE auto_classified = true
GROUP BY classification_source;

-- Verification level distribution
SELECT 
  verification_level,
  COUNT(*) as count
FROM deep_search_sources
GROUP BY verification_level;

-- Jurisdiction distribution
SELECT 
  unnest(jurisdictions) as jurisdiction,
  COUNT(*) as count
FROM deep_search_sources
GROUP BY jurisdiction
ORDER BY count DESC;
```

## Common Issues & Fixes

### Issue 1: Too Many "UNKNOWN" Classifications

**Symptom**: Many sources classified as UNKNOWN category

**Fix**:
```bash
# Identify unknown domains
SELECT DISTINCT 
  regexp_replace(base_url, '^https?://([^/]+).*', '\1') as domain
FROM deep_search_sources
WHERE source_type IS NULL OR source_type = 'UNKNOWN'
LIMIT 50;

# Add domain rules
pnpm tsx scripts/manage-domain-rules.ts add
```

### Issue 2: Low Confidence Scores

**Symptom**: Average confidence < 70%

**Fix**:
```bash
# Reclassify with LLM
curl -X POST http://localhost:3001/api/v1/web-sources/{id}/reclassify \
  -H "Content-Type: application/json" \
  -d '{"force_llm": true}'

# Or batch reclassify
pnpm tsx scripts/classify-existing-sources.ts --force-llm
```

### Issue 3: Wrong Classifications

**Symptom**: Sources misclassified (e.g., tax site marked as IFRS)

**Fix**:
1. **Immediate**: Manually update in database
   ```sql
   UPDATE deep_search_sources
   SET 
     source_type = 'tax_authority',
     verification_level = 'primary',
     auto_classified = false,
     classification_source = 'MANUAL'
   WHERE id = '{id}';
   ```

2. **Long-term**: Add/update domain rule
   ```bash
   pnpm tsx scripts/manage-domain-rules.ts add
   ```

### Issue 4: High LLM Costs

**Symptom**: Monthly OpenAI bill > expected

**Fix**:
1. **Increase heuristic threshold** (use LLM less)
   ```typescript
   // In web-sources.ts
   const classification = await classifyWebSource(ctx, {
     heuristicThreshold: 90, // Higher = use LLM less
   });
   ```

2. **Add more domain rules** (reduce LLM usage)
   ```bash
   # Identify domains that use LLM frequently
   SELECT 
     regexp_replace(base_url, '^https?://([^/]+).*', '\1') as domain,
     COUNT(*) as llm_uses
   FROM deep_search_sources
   WHERE classification_source IN ('LLM', 'MIXED')
   GROUP BY domain
   ORDER BY llm_uses DESC
   LIMIT 20;
   
   # Add rules for top domains
   pnpm tsx scripts/manage-domain-rules.ts add
   ```

## Updating Domain Rules

### Add a New Rule

1. **Via CLI** (recommended for production):
   ```bash
   pnpm tsx scripts/manage-domain-rules.ts add
   ```

2. **Via Code** (for persistence):
   Edit `services/rag/knowledge/classification/heuristic.ts`:
   ```typescript
   {
     domain: "new-authority.gov",
     category: "TAX",
     jurisdictionCode: "XX",
     tags: ["tax", "authority"],
     sourceType: "tax_authority",
     verificationLevel: "primary",
     sourcePriority: "authoritative",
   },
   ```

3. **Rebuild & Deploy**:
   ```bash
   pnpm --filter @prisma-glow/rag-service build
   # Restart gateway
   ```

### Test a Rule

```bash
pnpm tsx scripts/manage-domain-rules.ts test
# Enter URL: https://new-authority.gov
```

### Backup Rules

```bash
# Export to JSON
pnpm tsx scripts/manage-domain-rules.ts export > rules-backup.json

# Restore (manual: copy rules from JSON to heuristic.ts)
```

## Database Maintenance

### Rebuild Classification Index
```sql
-- If classification index is slow
REINDEX INDEX idx_deep_search_sources_auto_classified;
REINDEX INDEX idx_ckb_auto_classified;
```

### Clean Up Old Classifications
```sql
-- Remove classification data from inactive sources
UPDATE deep_search_sources
SET 
  auto_classified = false,
  classification_confidence = NULL,
  classification_source = NULL
WHERE is_active = false;
```

### Migrate Legacy Sources
```bash
# Classify all unclassified sources
pnpm tsx scripts/classify-existing-sources.ts --dry-run  # Test first
pnpm tsx scripts/classify-existing-sources.ts            # Apply
```

## Monitoring

### Key Metrics to Track

1. **Classification Rate**
   ```sql
   SELECT 
     COUNT(CASE WHEN auto_classified THEN 1 END) * 100.0 / COUNT(*) as auto_rate
   FROM deep_search_sources;
   ```
   Target: >80%

2. **Average Confidence**
   ```sql
   SELECT AVG(classification_confidence) as avg_confidence
   FROM deep_search_sources
   WHERE auto_classified = true;
   ```
   Target: >75%

3. **LLM Usage Rate**
   ```sql
   SELECT 
     COUNT(CASE WHEN classification_source IN ('LLM', 'MIXED') THEN 1 END) * 100.0 / 
     COUNT(CASE WHEN auto_classified THEN 1 END) as llm_rate
   FROM deep_search_sources;
   ```
   Target: <20% (most should be heuristic)

4. **Unknown Rate**
   ```sql
   SELECT 
     COUNT(CASE WHEN source_type IS NULL OR source_type = 'UNKNOWN' THEN 1 END) * 100.0 / 
     COUNT(*) as unknown_rate
   FROM deep_search_sources;
   ```
   Target: <5%

### Set Up Alerts

Create alerts for:
- Confidence drops below 70% average
- Unknown rate exceeds 10%
- LLM usage exceeds budget
- Classification failures

## Upgrading

### Update OpenAI Model

To use a newer/different model:

1. Edit `services/rag/knowledge/classification/llm.ts`:
   ```typescript
   model: "gpt-4o", // or "gpt-4-turbo", etc.
   ```

2. Test:
   ```bash
   pnpm tsx scripts/manage-domain-rules.ts test
   ```

3. Deploy:
   ```bash
   pnpm --filter @prisma-glow/rag-service build
   ```

### Add New Source Types

1. Update database enum (if using):
   ```sql
   -- Add to deep_search_sources source_type check constraint
   ALTER TABLE deep_search_sources DROP CONSTRAINT IF EXISTS source_type_check;
   ALTER TABLE deep_search_sources ADD CONSTRAINT source_type_check
     CHECK (source_type IN (..., 'new_type'));
   ```

2. Update TypeScript types:
   ```typescript
   // In web-sources.ts and types.ts
   .enum([..., "new_type"])
   ```

3. Add domain rules for new type

## Troubleshooting

### Classification Not Working

1. **Check API route is registered**
   ```bash
   curl http://localhost:3001/api/v1/web-sources
   # Should return 200 OK
   ```

2. **Check database migration applied**
   ```sql
   \d deep_search_sources
   # Should show auto_classified, classification_confidence, classification_source
   ```

3. **Check OpenAI API key** (if using LLM)
   ```bash
   echo $OPENAI_API_KEY
   # Should output sk-...
   ```

4. **Check logs**
   ```bash
   # Gateway logs
   tail -f logs/gateway.log | grep classification
   ```

### Performance Issues

1. **Slow classification**
   - Check OpenAI API response times
   - Consider caching LLM results
   - Increase heuristic threshold

2. **Database slow**
   - Check indexes exist
   - Run `VACUUM ANALYZE deep_search_sources`
   - Consider partitioning if >100k sources

## Support

For issues not covered here:
1. Check full documentation: `classification/README.md`
2. Review implementation: `WEB_SOURCE_AUTO_CLASSIFICATION_IMPLEMENTATION.md`
3. Check tests: `classification/heuristic.test.ts`
4. Contact: system maintainer

## Backup & Recovery

### Backup Rules
```bash
# Backup current rules
pnpm tsx scripts/manage-domain-rules.ts export > backups/rules-$(date +%Y%m%d).json

# Backup classification data
pg_dump -t deep_search_sources "$DATABASE_URL" > backups/sources-$(date +%Y%m%d).sql
```

### Restore
```bash
# Restore from SQL backup
psql "$DATABASE_URL" < backups/sources-YYYYMMDD.sql

# Restore rules (manual: copy to heuristic.ts)
# Then rebuild:
pnpm --filter @prisma-glow/rag-service build
```
