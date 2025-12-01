# Web Source Auto-Classification System

Automatically categorizes, tags, and classifies web knowledge sources using heuristic rules and optional LLM refinement.

## Overview

This system enables automatic classification of web sources (URLs) into structured metadata:
- **Category**: IFRS, ISA, TAX, CORP, REG, etc.
- **Jurisdiction**: RW, MT, GLOBAL, EU, US, etc.
- **Tags**: Specific labels like "ifrs9", "rwanda-vat", "audit-standards"
- **Source Type**: ifrs_foundation, tax_authority, big_four, etc.
- **Verification Level**: primary, secondary, tertiary
- **Confidence Score**: 0-100

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Admin UI / API                     │
│           POST /api/v1/web-sources                  │
│           { name, url }                             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Classification Orchestrator│
        │  services/rag/knowledge/   │
        │      classification/       │
        └────────────┬───────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│   Heuristic   │         │     LLM      │
│  Classifier   │         │  Classifier  │
│  (Fast, Free) │         │ (Smart, $$)  │
└───────┬───────┘         └──────┬───────┘
        │                        │
        └────────────┬───────────┘
                     ▼
        ┌────────────────────────────┐
        │   Supabase Database        │
        │  deep_search_sources       │
        │  + auto_classified         │
        │  + classification_source   │
        │  + classification_confidence│
        └────────────────────────────┘
```

## Database Schema

The migration `20260201120000_auto_classification_columns.sql` adds:

```sql
-- Track auto-classification metadata
auto_classified BOOLEAN DEFAULT false
classification_confidence INTEGER (0-100)
classification_source TEXT ('HEURISTIC' | 'LLM' | 'MIXED' | 'MANUAL')
```

Applied to:
- `deep_search_sources` (primary)
- `curated_knowledge_base` (for consistency)
- `web_knowledge_sources` (legacy, if exists)

## Classification Module

### Location
`services/rag/knowledge/classification/`

### Files
- **`types.ts`**: TypeScript types and interfaces
- **`heuristic.ts`**: Fast rule-based classifier (200+ domain rules)
- **`llm.ts`**: OpenAI-based refinement for unknown sources
- **`index.ts`**: Main orchestrator

### Usage

#### Basic Classification

```typescript
import { classifyWebSource } from "services/rag/knowledge/classification";

const result = await classifyWebSource({
  url: "https://www.ifrs.org/issued-standards/",
  pageTitle: "IFRS Standards",
});

console.log(result);
// {
//   category: "IFRS",
//   jurisdictionCode: "GLOBAL",
//   tags: ["ifrs", "ias", "standards", "financial-reporting"],
//   confidence: 85,
//   source: "HEURISTIC",
//   sourceType: "ifrs_foundation",
//   verificationLevel: "primary",
//   sourcePriority: "authoritative"
// }
```

#### Heuristic Only (No LLM)

```typescript
const result = await classifyWebSource(
  { url: "https://cfr.gov.mt" },
  { heuristicOnly: true }
);
```

#### Force LLM Refinement

```typescript
const result = await classifyWebSource(
  { 
    url: "https://unknown-source.com",
    pageTitle: "Tax Guidelines",
    pageSnippet: "Annual tax filing requirements..."
  },
  { forceLLM: true }
);
```

## API Integration

### Create Web Source with Auto-Classification

**Endpoint:** `POST /api/v1/web-sources`

**Request:**
```json
{
  "name": "Rwanda Revenue Authority",
  "base_url": "https://rra.gov.rw",
  "page_title": "RRA - Tax Administration",
  "sync_enabled": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Rwanda Revenue Authority",
  "base_url": "https://rra.gov.rw",
  "source_type": "tax_authority",
  "verification_level": "primary",
  "source_priority": "authoritative",
  "jurisdictions": ["RW"],
  "domains": ["tax"],
  "auto_classified": true,
  "classification_confidence": 85,
  "classification_source": "HEURISTIC",
  "created_at": "2025-01-28T..."
}
```

### Manual Override

If admin provides explicit classification, it overrides auto-classification:

```json
{
  "name": "Custom Source",
  "base_url": "https://example.com",
  "source_type": "company_policy",
  "verification_level": "tertiary",
  "force_manual": true  // Skip auto-classification
}
```

### Re-classify Existing Source

**Endpoint:** `POST /api/v1/web-sources/:id/reclassify`

```bash
curl -X POST http://localhost:3001/api/v1/web-sources/{id}/reclassify \
  -H "Content-Type: application/json" \
  -d '{ "force_llm": true }'
```

### Update Source (Resets to Manual)

When admin edits a source, `auto_classified` is set to `false`:

```json
PATCH /api/v1/web-sources/:id
{
  "source_type": "big_four",
  "verification_level": "secondary"
}
```

Result: `auto_classified: false`, `classification_source: "MANUAL"`

## Heuristic Rules

The heuristic classifier has **200+ pre-configured domain rules** covering:

### Global Standards
- IFRS Foundation (`ifrs.org`)
- IAASB (`iaasb.org`)
- OECD (`oecd.org`)
- FASB (`fasb.org`)

### Big Four
- KPMG (`kpmg.com`)
- PwC (`pwc.com`, `viewpoint.pwc.com`)
- Deloitte (`iasplus.com`, `deloitte.com`)
- EY (`ey.com`)

### Professional Bodies
- ACCA (`accaglobal.com`)
- AICPA (`aicpa.org`)
- ICAEW (`icaew.com`)
- CIMA (`cimaglobal.com`)

### Rwanda
- Rwanda Revenue Authority (`rra.gov.rw`)
- Rwanda Development Board (`rdb.rw`)
- National Bank of Rwanda (`bnr.rw`)

### Malta
- Commissioner for Revenue (`cfr.gov.mt`)
- MFSA (`mfsa.mt`)
- FIAU (`fiaumalta.org`)
- Malta Business Registry (`mbr.mt`)
- Malta Institute of Accountants (`mia.org.mt`)

### Other Jurisdictions
- Kenya KRA (`kra.go.ke`)
- Uganda URA (`ura.go.ug`)
- Tanzania TRA (`tra.go.tz`)
- South Africa SARS (`sars.gov.za`)
- EU institutions (`ec.europa.eu`, `eur-lex.europa.eu`)

### Extending Rules

Add new rules programmatically:

```typescript
import { addDomainRule } from "services/rag/knowledge/classification";

addDomainRule({
  domain: "example-authority.org",
  category: "TAX",
  jurisdictionCode: "XX",
  tags: ["tax", "example"],
  sourceType: "tax_authority",
  verificationLevel: "primary",
  sourcePriority: "authoritative",
});
```

## LLM Classification

When heuristic confidence is low (<80) or category is `UNKNOWN`, the system optionally calls OpenAI for refinement.

### Requirements
- **API Key:** `OPENAI_API_KEY` environment variable
- **Model:** `gpt-4o-mini` (fast, cost-effective)
- **Cost:** ~$0.001 per classification

### How It Works

1. Heuristic provides initial guess
2. LLM receives:
   - URL
   - Page title (if available)
   - Page snippet (if available)
   - Heuristic guess (as hint)
3. LLM returns structured JSON with refined classification
4. System merges both results (tags combined, confidence averaged)
5. Final source: `"MIXED"`

### Disabling LLM

Set `heuristicOnly: true` or omit `OPENAI_API_KEY`:

```typescript
const result = await classifyWebSource(
  { url: "..." },
  { heuristicOnly: true }
);
```

## Integration with DeepSearch

Once sources are classified, agents can filter by category/jurisdiction:

```sql
-- ISA Audit Agent: Only audit standards
SELECT base_url
FROM deep_search_sources
WHERE is_active = true
  AND source_type IN ('iaasb', 'regulatory_pdf')
  AND 'ISA' = ANY(domains)
  AND ('GLOBAL' = ANY(jurisdictions) OR 'EU' = ANY(jurisdictions));

-- Rwanda Tax Agent: RRA + OECD + East Africa
SELECT base_url
FROM deep_search_sources
WHERE is_active = true
  AND source_type IN ('tax_authority', 'oecd')
  AND ('RW' = ANY(jurisdictions) OR 'GLOBAL' = ANY(jurisdictions));

-- Malta Corporate Agent: MBR, MFSA, CFR
SELECT base_url
FROM deep_search_sources
WHERE is_active = true
  AND 'MT' = ANY(jurisdictions)
  AND source_type IN ('regulatory_pdf', 'tax_authority');
```

## Admin UI Integration

The admin panel should display:

### List View
| Name | URL | Category | Jurisdiction | Auto-Classified | Confidence | Actions |
|------|-----|----------|--------------|-----------------|------------|---------|
| IFRS Foundation | ifrs.org | IFRS | GLOBAL | ✅ Yes | 85% | Edit, Reclassify |
| Unknown Source | example.com | UNKNOWN | GLOBAL | ✅ Yes | 20% | Edit, Reclassify |

### Detail View
- Show classification metadata
- Badge: "Auto-classified (85%)" or "Manually classified"
- Button: "Re-classify with LLM" (if confidence low)
- Allow editing all fields
- On save → `auto_classified: false`

### Bulk Classification
```typescript
import { classifyBatch } from "services/rag/knowledge/classification";

const contexts = urls.map(url => ({ url }));
const results = await classifyBatch(contexts, { heuristicOnly: true });
```

## Configuration

### Environment Variables

```bash
# Required for LLM classification
OPENAI_API_KEY=sk-...

# Optional: Default confidence threshold
CLASSIFICATION_HEURISTIC_THRESHOLD=80

# Optional: Force LLM for all classifications
CLASSIFICATION_FORCE_LLM=false
```

### Thresholds

```typescript
// Default: use LLM if confidence < 80
await classifyWebSource(ctx, { heuristicThreshold: 80 });

// More aggressive: use LLM if confidence < 90
await classifyWebSource(ctx, { heuristicThreshold: 90 });
```

## Testing

### Unit Tests

```bash
# Test heuristic classifier
npm test services/rag/knowledge/classification/heuristic.test.ts

# Test LLM classifier (requires OPENAI_API_KEY)
npm test services/rag/knowledge/classification/llm.test.ts
```

### Integration Test

```bash
# Create source via API
curl -X POST http://localhost:3001/api/v1/web-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Source",
    "base_url": "https://ifrs.org"
  }'

# Check auto_classified fields
curl http://localhost:3001/api/v1/web-sources/{id}
```

## Performance

### Heuristic Classifier
- **Latency:** <1ms
- **Cost:** $0 (free)
- **Accuracy:** ~85% for known domains, ~20% for unknown

### LLM Classifier
- **Latency:** ~500-1000ms
- **Cost:** ~$0.001 per classification
- **Accuracy:** ~90-95% with context

### Batch Processing
Process 100 URLs:
- **Heuristic only:** <100ms, $0
- **With LLM refinement:** ~20 seconds (5 concurrent), ~$0.10

## Future Enhancements

1. **Active Learning**: Track admin corrections, retrain heuristic rules
2. **Confidence Boosting**: Use page content analysis (fetch + parse HTML)
3. **Domain Embeddings**: Semantic similarity for "is this similar to known domains?"
4. **Batch LLM**: Send 10 URLs per LLM call (cheaper, faster)
5. **UI Feedback Loop**: "Was this classification correct?" → improve rules
6. **Multi-language**: Detect non-English sources (e.g., Maltese, Kinyarwanda)

## Troubleshooting

### Classification returns "UNKNOWN"
- Domain not in heuristic rules
- Enable LLM: set `OPENAI_API_KEY` or provide `pageTitle`/`pageSnippet`
- Add domain rule manually

### LLM classification fails
- Check `OPENAI_API_KEY` is valid
- Check OpenAI API quota/rate limits
- Fallback to heuristic automatically

### Low confidence scores
- Provide `pageTitle` and `pageSnippet` for better LLM context
- Add domain to heuristic rules for instant 85% confidence

### Database constraint violations
- Ensure `source_type` matches enum values
- Ensure `jurisdictions` is array of strings
- Check `classification_confidence` is 0-100

## Related Documentation

- [Deep Search Architecture](../../docs/DEEP_SEARCH.md)
- [Curated Knowledge Base Schema](../../supabase/migrations/20260201100000_curated_knowledge_base.sql)
- [API Routes](../../apps/gateway/src/routes/)

## License

Proprietary - Prisma Glow Operations Suite
