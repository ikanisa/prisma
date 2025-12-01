# ✅ Auto-Classification Quick Checklist

**Last Validated**: 2025-12-01  
**Status**: ✅ Ready for deployment

---

## 📋 Pre-Deployment Checklist

### Prerequisites
- [x] Node.js 22.12.0+ installed
- [x] pnpm 9.12.3 installed
- [x] PostgreSQL database available
- [ ] DATABASE_URL environment variable set
- [ ] OPENAI_API_KEY set (optional, for LLM)

### Files Validated (26/26)
- [x] Database migration
- [x] Core engine (5 files)
- [x] API routes
- [x] Utility scripts (3 files)
- [x] UI components (2 files)
- [x] Documentation (8 files)
- [x] Deployment script
- [x] Validation script

---

## 🚀 Deployment Checklist

### Step 1: Deploy Backend (30 min)
```bash
# One-command deploy
./deploy-auto-classification.sh
```

**OR Manual Steps**:
```bash
# 1. Apply migration
psql "$DATABASE_URL" -f supabase/migrations/20260201120000_auto_classification_columns.sql

# 2. Install dependencies
pnpm install --frozen-lockfile

# 3. Build services
pnpm --filter @prisma-glow/rag-service build
pnpm --filter @prisma-glow/gateway build
```

**Validation**:
- [ ] Migration applied without errors
- [ ] RAG service builds successfully
- [ ] Gateway builds successfully
- [ ] No TypeScript compilation errors

### Step 2: Start & Test API (20 min)
```bash
# Start gateway
pnpm --filter @prisma-glow/gateway dev
```

**Test Cases**:
```bash
# Test 1: Create source (IFRS - known domain)
curl -X POST http://localhost:3001/api/v1/web-sources \
  -H "Content-Type: application/json" \
  -d '{"name":"IFRS Foundation","base_url":"https://www.ifrs.org"}'

# Expected:
# - 200 OK
# - classification_confidence: 85
# - classification_source: "HEURISTIC"
# - source_type: "ifrs_foundation"
# - jurisdictions: ["GLOBAL"]

# Test 2: Create source (Rwanda - known domain)
curl -X POST http://localhost:3001/api/v1/web-sources \
  -H "Content-Type: application/json" \
  -d '{"name":"Rwanda Revenue Authority","base_url":"https://www.rra.gov.rw"}'

# Expected:
# - 200 OK
# - classification_confidence: 85
# - classification_source: "HEURISTIC"
# - source_type: "tax_authority"
# - jurisdictions: ["RW"]

# Test 3: List sources
curl http://localhost:3001/api/v1/web-sources

# Expected:
# - 200 OK
# - Array of sources with classification metadata

# Test 4: Filter auto-classified
curl "http://localhost:3001/api/v1/web-sources?auto_classified=true"

# Expected:
# - 200 OK
# - Only auto-classified sources returned

# Test 5: Reclassify (if source exists)
curl -X POST http://localhost:3001/api/v1/web-sources/{id}/reclassify \
  -H "Content-Type: application/json" \
  -d '{"force_llm":true}'

# Expected:
# - 200 OK
# - Updated classification (possibly with LLM)
```

**Validation**:
- [ ] POST creates source successfully
- [ ] Classification metadata is populated
- [ ] Confidence scores are reasonable (>80 for known domains)
- [ ] GET returns list of sources
- [ ] Filters work correctly
- [ ] Reclassify endpoint works

### Step 3: Classify Existing Sources (30 min - Optional)
```bash
# Dry run first (preview what will happen)
pnpm tsx scripts/classify-existing-sources.ts --dry-run

# Review output, then apply
pnpm tsx scripts/classify-existing-sources.ts

# OR with LLM for better accuracy
pnpm tsx scripts/classify-existing-sources.ts --force-llm
```

**Validation**:
- [ ] Script runs without errors
- [ ] Existing sources are classified
- [ ] Confidence scores look reasonable
- [ ] Unknown domains identified (add rules for them)

### Step 4: Generate Baseline Report (10 min)
```bash
# Generate report
pnpm tsx scripts/generate-classification-report.ts --format=markdown

# View report
cat classification-report-*.md
```

**Check Metrics**:
- [ ] Average confidence >70%
- [ ] Unknown rate <10%
- [ ] LLM usage reasonable (<20% if heuristic threshold is low)

---

## 🎨 Admin UI Checklist (Week 1-2)

### Components to Build
- [ ] **WebSourcesList** - List all sources with filters
  - Use: `useWebSources()` hook
  - Features: pagination, filters (auto_classified, source_type, jurisdiction)
  
- [ ] **CreateWebSourceForm** - Add new source
  - Use: `useCreateWebSource()` hook
  - Fields: name, base_url, description (optional)
  - Advanced: page_title, page_snippet, force_manual
  
- [ ] **WebSourceDetail** - View/edit source
  - Use: `useUpdateWebSource()` hook
  - Show: all classification metadata
  - Actions: edit, reclassify, delete

- [ ] **ClassificationBadges** - UI indicators
  - Confidence badge (color-coded)
  - Source badge (HEURISTIC/LLM/MIXED/MANUAL)
  - Verification level badge

### Routes to Add
- [ ] `/admin/knowledge/web-sources` - List view
- [ ] `/admin/knowledge/web-sources/new` - Create form
- [ ] `/admin/knowledge/web-sources/:id` - Detail/edit view

### Reference Files
- `services/rag/knowledge/classification/ADMIN_UI_EXAMPLE.tsx` - Component examples
- `services/rag/knowledge/classification/react-hooks.ts` - Ready-to-use hooks

---

## 🔗 Agent Integration Checklist (Week 2-3)

### Update Agent Queries
- [ ] ISA Audit Agent
  ```sql
  WHERE source_type IN ('iaasb', 'regulatory_pdf')
    AND 'GLOBAL' = ANY(jurisdictions)
  ```

- [ ] Rwanda Tax Agent
  ```sql
  WHERE source_type = 'tax_authority'
    AND ('RW' = ANY(jurisdictions) OR 'GLOBAL' = ANY(jurisdictions))
  ```

- [ ] Malta Tax Agent
  ```sql
  WHERE source_type = 'tax_authority'
    AND ('MT' = ANY(jurisdictions) OR 'EU' = ANY(jurisdictions))
  ```

- [ ] Malta Corporate Agent
  ```sql
  WHERE source_type IN ('company_registry', 'regulatory_pdf')
    AND ('MT' = ANY(jurisdictions) OR 'EU' = ANY(jurisdictions))
  ```

- [ ] IFRS Agent
  ```sql
  WHERE source_type IN ('ifrs_foundation', 'big_four')
    AND 'GLOBAL' = ANY(jurisdictions)
  ```

### Validation
- [ ] Agents use filtered sources only
- [ ] No cross-contamination (tax agent doesn't see audit sources)
- [ ] Query performance improved
- [ ] Answer accuracy improved (manual spot-check)

---

## 📊 Monitoring Checklist (Ongoing)

### Weekly Tasks
- [ ] Generate classification report
- [ ] Review low-confidence sources (<50%)
- [ ] Identify frequently appearing unknown domains
- [ ] Add domain rules for new domains
- [ ] Review LLM usage and costs

### Monthly Tasks
- [ ] Comprehensive audit of classification accuracy
- [ ] Review and update domain rules
- [ ] Analyze classification method distribution
- [ ] Optimize heuristic thresholds if needed

### Metrics to Track
- [ ] Average confidence score (target: >80%)
- [ ] Unknown rate (target: <5%)
- [ ] LLM usage rate (target: <20%)
- [ ] Classification accuracy (target: >95% via sampling)
- [ ] API response times
- [ ] Error rates

---

## 🛠️ Maintenance Checklist

### Daily (5 min)
- [ ] Check for classification errors in logs
- [ ] Review auto-classified sources for obvious mistakes

### Weekly (30 min)
- [ ] Generate classification report
- [ ] Add domain rules for unknown domains
- [ ] Review low-confidence sources
- [ ] Check LLM costs

### Monthly (2 hours)
- [ ] Comprehensive audit
- [ ] Rule optimization
- [ ] Performance review
- [ ] Update documentation

### Quarterly (1 day)
- [ ] Deep accuracy validation (sample 100 sources)
- [ ] System optimization
- [ ] Feature enhancements planning
- [ ] Update pre-configured rules for new authorities

---

## 📚 Quick Reference

### Commands
```bash
# Deploy
./deploy-auto-classification.sh

# Validate
./validate-auto-classification.sh

# Classify existing
pnpm tsx scripts/classify-existing-sources.ts [--dry-run] [--force-llm]

# Manage rules
pnpm tsx scripts/manage-domain-rules.ts [add|list|test|export]

# Generate report
pnpm tsx scripts/generate-classification-report.ts [--format=markdown|csv|json]

# Start gateway
pnpm --filter @prisma-glow/gateway dev
```

### Files
- **Main README**: `AUTO_CLASSIFICATION_README.md`
- **Quick Start**: `WEB_SOURCE_AUTO_CLASSIFICATION_QUICK_START.md`
- **Implementation**: `WEB_SOURCE_AUTO_CLASSIFICATION_IMPLEMENTATION.md`
- **Roadmap**: `AUTO_CLASSIFICATION_ROADMAP.md`
- **Maintenance**: `services/rag/knowledge/classification/MAINTENANCE.md`

### API Endpoints
- `POST /api/v1/web-sources` - Create
- `GET /api/v1/web-sources` - List
- `GET /api/v1/web-sources/:id` - Get
- `PATCH /api/v1/web-sources/:id` - Update
- `POST /api/v1/web-sources/:id/reclassify` - Reclassify
- `DELETE /api/v1/web-sources/:id` - Delete

---

## ✅ Success Criteria

### Phase 1: Backend (COMPLETE ✅)
- [x] All files created and validated (26/26)
- [x] 100% test pass rate
- [x] Documentation complete
- [x] One-command deployment ready

### Phase 2: Deployment (NEXT)
- [ ] Backend deployed successfully
- [ ] All API endpoints working
- [ ] 90%+ of existing sources classified

### Phase 3: UI (Week 1-2)
- [ ] Full CRUD UI functional
- [ ] Admin can manage sources
- [ ] Bulk operations working

### Phase 4: Agents (Week 2-3)
- [ ] Agents use filtered sources
- [ ] Query performance improved
- [ ] Answer accuracy improved

### Phase 5: Production (Ongoing)
- [ ] Average confidence >80%
- [ ] Unknown rate <5%
- [ ] LLM cost <$10/month
- [ ] 95%+ accuracy (sampled)

---

## 🎯 Current Status

**Phase 1**: ✅ **100% Complete**  
**Validation**: ✅ **26/26 Checks Passed**  
**Deployment**: 🚀 **Ready to Deploy**

**Next Step**: Run `./deploy-auto-classification.sh`

---

**Last Updated**: 2025-12-01  
**Version**: 1.0.0
