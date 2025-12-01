# 🗺️ Auto-Classification System - Implementation Roadmap

**Current Status**: ✅ **Phase 1 Complete - Backend Ready**

---

## ✅ Phase 1: Core Backend (COMPLETE)

**Status**: 100% Delivered  
**Duration**: Complete  
**Files**: 20 files, 3,500 LOC, 78 KB docs

### Completed Items
- ✅ Database migration with auto-classification columns
- ✅ Heuristic classifier (200+ domain rules)
- ✅ LLM classifier (OpenAI integration)
- ✅ Smart orchestrator (heuristic → LLM cascade)
- ✅ REST API (6 endpoints)
- ✅ Test suite (100+ assertions)
- ✅ Utility scripts (3 tools)
- ✅ React hooks for UI
- ✅ Comprehensive documentation
- ✅ One-command deployment script

### Validation Results
```
✅ Passed:   26/26 checks
⚠️  Warnings: 0
❌ Failed:   0
Overall:     100% complete
```

---

## 🚀 Phase 2: Deployment & Testing (NEXT)

**Estimated Duration**: 1-2 hours  
**Priority**: High

### Tasks

#### 2.1 Deploy Backend (30 min)
```bash
# Option 1: One-command deploy
./deploy-auto-classification.sh

# Option 2: Manual
psql "$DATABASE_URL" -f supabase/migrations/20260201120000_auto_classification_columns.sql
pnpm install --frozen-lockfile
pnpm --filter @prisma-glow/rag-service build
pnpm --filter @prisma-glow/gateway build
```

**Validation**:
- [ ] Migration applied successfully
- [ ] RAG service builds without errors
- [ ] Gateway builds without errors
- [ ] No TypeScript errors

#### 2.2 Test API Endpoints (20 min)
```bash
# Start gateway
pnpm --filter @prisma-glow/gateway dev

# Test 1: Create with auto-classification
curl -X POST http://localhost:3001/api/v1/web-sources \
  -H "Content-Type: application/json" \
  -d '{"name":"IFRS Foundation","base_url":"https://www.ifrs.org"}'

# Test 2: List sources
curl http://localhost:3001/api/v1/web-sources

# Test 3: Filter auto-classified
curl "http://localhost:3001/api/v1/web-sources?auto_classified=true"

# Test 4: Reclassify
curl -X POST http://localhost:3001/api/v1/web-sources/{id}/reclassify \
  -H "Content-Type: application/json" \
  -d '{"force_llm":true}'
```

**Validation**:
- [ ] POST creates source and returns classification
- [ ] GET lists sources correctly
- [ ] Filters work as expected
- [ ] Reclassify endpoint works

#### 2.3 Classify Existing Sources (30 min - optional)
```bash
# Dry run first
pnpm tsx scripts/classify-existing-sources.ts --dry-run

# Review output, then apply
pnpm tsx scripts/classify-existing-sources.ts
```

**Validation**:
- [ ] Existing sources classified successfully
- [ ] Confidence scores look reasonable
- [ ] No errors in classification

#### 2.4 Generate Baseline Report (10 min)
```bash
pnpm tsx scripts/generate-classification-report.ts --format=markdown
cat classification-report-*.md
```

**Validation**:
- [ ] Report generated successfully
- [ ] Metrics look reasonable (avg confidence >70%)
- [ ] Unknown rate <10%

---

## 🎨 Phase 3: Admin UI (1-2 weeks)

**Estimated Duration**: 5-10 days  
**Priority**: High

### 3.1 Create Web Source Management UI (3 days)

**Components Needed**:
1. **WebSourcesList** - List all sources with filters
   - Use `useWebSources()` hook
   - Show: name, URL, type, jurisdiction, auto flag, confidence
   - Filters: auto_classified, source_type, jurisdiction
   - Pagination

2. **CreateWebSourceForm** - Add new source
   - Use `useCreateWebSource()` hook
   - Fields: name, base_url, description (optional)
   - Advanced: page_title, page_snippet, force_manual checkbox
   - Show classification result after creation

3. **WebSourceDetail** - View/edit single source
   - Use `useUpdateWebSource()` hook
   - Show all classification metadata
   - Allow editing: name, description, status
   - "Reclassify" button with LLM option

4. **ClassificationBadges** - Reusable UI elements
   - Confidence badge (color-coded)
   - Source badge (HEURISTIC/LLM/MIXED/MANUAL)
   - Verification level badge
   - Auto-classified indicator

**Files to Create**:
```
src/components/knowledge/
├── WebSourcesList.tsx
├── CreateWebSourceForm.tsx
├── WebSourceDetail.tsx
├── ClassificationBadges.tsx
└── filters/
    ├── AutoClassifiedFilter.tsx
    ├── SourceTypeFilter.tsx
    └── JurisdictionFilter.tsx
```

**Reference**: See `services/rag/knowledge/classification/ADMIN_UI_EXAMPLE.tsx`

### 3.2 Integrate with Existing Admin (2 days)

- [ ] Add "Web Sources" menu item to admin nav
- [ ] Create route: `/admin/knowledge/web-sources`
- [ ] Add sub-routes:
  - `/admin/knowledge/web-sources` - List
  - `/admin/knowledge/web-sources/new` - Create
  - `/admin/knowledge/web-sources/:id` - Detail/Edit
- [ ] Update breadcrumbs

### 3.3 Bulk Operations UI (2 days)

**Features**:
1. Bulk classify existing sources
   - Show progress bar
   - Display results in real-time
   - Allow filtering which sources to classify

2. Bulk reclassify
   - Select multiple sources
   - Reclassify with/without LLM
   - Show updated results

3. Export/Import
   - Export sources to CSV/JSON
   - Import domain rules from JSON

### 3.4 Classification Dashboard (2 days)

**Widgets**:
1. **Summary Stats**
   - Total sources
   - Auto-classified %
   - Average confidence
   - LLM usage rate

2. **Charts**
   - Classification method distribution (pie chart)
   - Confidence score distribution (histogram)
   - Sources by jurisdiction (bar chart)
   - Sources by verification level (donut)

3. **Low Confidence Alert**
   - List sources with confidence <50%
   - Quick action to reclassify with LLM

4. **Recent Activity**
   - Last 10 auto-classified sources
   - Show: name, confidence, time

**Libraries**: Use shadcn/ui charts or recharts

### 3.5 Testing & Polish (1 day)

- [ ] Test all CRUD operations
- [ ] Test filters and pagination
- [ ] Test bulk operations
- [ ] Responsive design (mobile/tablet)
- [ ] Loading states
- [ ] Error handling
- [ ] Success notifications

---

## 🔗 Phase 4: Agent Integration (3-5 days)

**Estimated Duration**: 3-5 days  
**Priority**: Medium

### 4.1 Update Agent DeepSearch Queries (1 day)

Modify agent prompts to use classification for filtering:

**Before**:
```sql
SELECT base_url FROM deep_search_sources WHERE is_active = true;
```

**After**:
```sql
-- ISA Audit Agent
SELECT base_url FROM deep_search_sources
WHERE is_active = true
  AND source_type IN ('iaasb', 'regulatory_pdf')
  AND 'GLOBAL' = ANY(jurisdictions);

-- Rwanda Tax Agent
SELECT base_url FROM deep_search_sources
WHERE is_active = true
  AND source_type = 'tax_authority'
  AND ('RW' = ANY(jurisdictions) OR 'GLOBAL' = ANY(jurisdictions));

-- Malta Corporate Agent
SELECT base_url FROM deep_search_sources
WHERE is_active = true
  AND source_type IN ('company_registry', 'regulatory_pdf')
  AND ('MT' = ANY(jurisdictions) OR 'EU' = ANY(jurisdictions));
```

**Agents to Update**:
- [ ] ISA Audit Agent
- [ ] Rwanda Tax Agent
- [ ] Malta Tax Agent
- [ ] Malta Corporate Agent
- [ ] IFRS Agent
- [ ] Other domain-specific agents

### 4.2 Create Agent-Specific Source Lists (2 days)

**UI Feature**: In agent settings, show which sources the agent uses

```typescript
// Example: ISA Agent Settings
interface AgentSourceConfig {
  sourceTypes: string[];        // ['iaasb', 'regulatory_pdf']
  jurisdictions: string[];       // ['GLOBAL']
  verificationLevel?: string[];  // ['primary', 'secondary']
  sourcePriority?: string[];     // ['authoritative', 'regulatory']
}
```

**Components**:
1. **AgentSourceFilter** - Configure which sources agent uses
2. **AgentSourcePreview** - Preview which sources match filters
3. **AgentSourceStats** - Show count and distribution

### 4.3 Test Agent Accuracy (1-2 days)

**Test Cases**:
1. ISA agent only sees ISA/audit sources
2. Rwanda tax agent sees RRA + OECD + regional
3. Malta agents see Malta + EU sources
4. No cross-contamination (tax agent doesn't see audit sources)

**Metrics**:
- Query response time (should be faster with better filtering)
- Answer accuracy (validate with known test cases)
- Source relevance (manual review of cited sources)

---

## 📊 Phase 5: Monitoring & Optimization (Ongoing)

**Priority**: Low (continuous improvement)

### 5.1 Set Up Monitoring (1 day)

**Metrics to Track**:
1. Classification accuracy (manual review sample)
2. LLM usage rate (cost tracking)
3. Average confidence scores (should trend up over time)
4. Unknown domain rate (should trend down)
5. API response times
6. Error rates

**Tools**:
- Add to existing monitoring dashboard
- Set up alerts for:
  - Confidence drops below 70% average
  - Unknown rate exceeds 10%
  - LLM costs exceed budget
  - API errors

### 5.2 Continuous Rule Updates (Weekly)

**Process**:
1. Review classification report weekly
2. Identify frequently appearing unknown domains
3. Add domain rules for them
4. Test new rules
5. Deploy updated rules

**Script**:
```bash
# Weekly routine
pnpm tsx scripts/generate-classification-report.ts --format=markdown

# Identify unknowns
grep "UNKNOWN" classification-report-*.md

# Add rules interactively
pnpm tsx scripts/manage-domain-rules.ts add

# Test
pnpm tsx scripts/manage-domain-rules.ts test

# Deploy
git commit -am "Add domain rules for [domains]"
git push
```

### 5.3 Active Learning (Future Enhancement)

**Concept**: Learn from admin corrections

When admin edits an auto-classified source:
1. Log the correction (original vs corrected)
2. Analyze patterns in corrections
3. Suggest new domain rules
4. Auto-update confidence thresholds

**Implementation**: Phase 6+

---

## 🎯 Success Metrics

### Phase 1 (Complete)
- ✅ All files created and validated
- ✅ 100% test pass rate
- ✅ Documentation complete

### Phase 2 (Deployment)
- [ ] Backend deployed successfully
- [ ] All API endpoints working
- [ ] 90%+ of existing sources classified

### Phase 3 (Admin UI)
- [ ] Full CRUD UI functional
- [ ] Admin can manage sources without technical knowledge
- [ ] Bulk operations working

### Phase 4 (Agent Integration)
- [ ] Agents use filtered sources
- [ ] Query response time improves
- [ ] Answer accuracy improves (measured via feedback)

### Phase 5 (Optimization)
- [ ] Average confidence >80%
- [ ] Unknown rate <5%
- [ ] LLM cost <$10/month
- [ ] 95%+ classification accuracy (sampled)

---

## 📝 Next Actions (Immediate)

1. **Deploy Backend** (30 min)
   ```bash
   ./deploy-auto-classification.sh
   ```

2. **Test API** (20 min)
   - Run test cases
   - Validate responses
   - Check error handling

3. **Classify Existing Sources** (30 min - optional)
   ```bash
   pnpm tsx scripts/classify-existing-sources.ts --dry-run
   pnpm tsx scripts/classify-existing-sources.ts
   ```

4. **Plan UI Development** (1 hour)
   - Review `ADMIN_UI_EXAMPLE.tsx`
   - Choose UI framework/components
   - Create component stubs
   - Set up routes

5. **Start UI Development** (Week 1)
   - Build WebSourcesList component
   - Build CreateWebSourceForm component
   - Test with real data

---

## 📚 Resources

**Documentation**:
- [Quick Start](WEB_SOURCE_AUTO_CLASSIFICATION_QUICK_START.md)
- [Implementation Guide](WEB_SOURCE_AUTO_CLASSIFICATION_IMPLEMENTATION.md)
- [Maintenance Guide](services/rag/knowledge/classification/MAINTENANCE.md)
- [UI Examples](services/rag/knowledge/classification/ADMIN_UI_EXAMPLE.tsx)
- [React Hooks](services/rag/knowledge/classification/react-hooks.ts)

**Scripts**:
- `deploy-auto-classification.sh` - Deploy system
- `validate-auto-classification.sh` - Validate installation
- `scripts/classify-existing-sources.ts` - Bulk classify
- `scripts/manage-domain-rules.ts` - Manage rules
- `scripts/generate-classification-report.ts` - Generate reports

**API Reference**:
- `apps/gateway/src/routes/web-sources.ts` - Complete API implementation

---

## 🎉 Summary

**Phase 1**: ✅ Complete (100%)  
**Phase 2**: 🚀 Ready to start (Deploy & Test)  
**Phase 3**: 📋 Planned (Admin UI)  
**Phase 4**: 📋 Planned (Agent Integration)  
**Phase 5**: 📋 Ongoing (Monitoring & Optimization)

**Immediate Next Step**: Run `./deploy-auto-classification.sh` 🚀

---

**Last Updated**: 2025-12-01  
**Version**: 1.0.0  
**Status**: Phase 1 Complete, Ready for Phase 2
