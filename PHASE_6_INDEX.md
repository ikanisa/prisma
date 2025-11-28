# Phase 6: RAG & Knowledge Management - Complete Index

## 📚 Documentation Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| **PHASE_6_INDEX.md** (this file) | Navigation hub | All |
| **PHASE_6_RAG_KNOWLEDGE_MANAGEMENT.md** | Complete implementation guide | Developers |
| **PHASE_6_VISUAL_SUMMARY.md** | Visual architecture overview | Technical leads |
| **PHASE_6_QUICK_REFERENCE.md** | API & SQL quick ref | Developers |

---

## 🎯 Phase 6 Overview

**Goal:** Build a world-class RAG (Retrieval-Augmented Generation) knowledge management system for AI agents.

**Status:** 30% Complete (Foundation Ready)

**What's Built:**
- ✅ Database schema (7 tables, 15+ indexes, 3 SQL functions)
- ✅ API schemas (Pydantic models)
- ✅ API routes (endpoint definitions)
- ✅ Pre-configured templates (7 source types)

**What's Next:**
- ⏳ Service layer implementation
- ⏳ Frontend admin pages
- ⏳ Background workers
- ⏳ Testing suite

---

## 📂 File Structure

```
prisma/
├── supabase/migrations/
│   └── 20250115000000_agent_knowledge_system.sql  # Complete DB schema
├── server/api/v1/knowledge/
│   ├── __init__.py                                # Package init
│   ├── schemas.py                                 # Pydantic models ✅
│   ├── routes.py                                  # API endpoints (skeleton) ✅
│   └── service.py                                 # Business logic (TODO)
├── server/workers/
│   └── knowledge_sync.py                          # Background sync (TODO)
├── src/pages/admin/knowledge/
│   ├── index.tsx                                  # Sources list (TODO)
│   ├── [id]/index.tsx                             # Source detail (TODO)
│   ├── [id]/documents.tsx                         # Document mgmt (TODO)
│   ├── search.tsx                                 # Search UI (TODO)
│   └── analytics.tsx                              # Analytics (TODO)
├── src/hooks/
│   └── useKnowledge.ts                            # React hooks (TODO)
├── tests/knowledge/
│   ├── test_service.py                            # Unit tests (TODO)
│   ├── test_routes.py                             # API tests (TODO)
│   └── test_search.py                             # Search tests (TODO)
└── docs/
    ├── PHASE_6_INDEX.md                           # This file
    ├── PHASE_6_RAG_KNOWLEDGE_MANAGEMENT.md        # Full guide
    ├── PHASE_6_VISUAL_SUMMARY.md                  # Visual overview
    └── PHASE_6_QUICK_REFERENCE.md                 # Quick ref
```

---

## 🗄️ Database Schema Quick Ref

### Core Tables

```sql
knowledge_sources          -- Source registry (Google Drive, websites, etc.)
  └── knowledge_documents  -- Individual documents
        └── knowledge_chunks -- Vector embeddings (HNSW indexed)

agent_knowledge_assignments -- Link agents to sources
knowledge_sync_jobs        -- Background sync orchestration
knowledge_search_analytics -- Search usage & feedback
knowledge_source_templates -- Pre-configured templates
```

### Key Indexes
- **HNSW** on `knowledge_chunks.embedding` (~10x faster similarity search)
- **GIN** on `knowledge_chunks.content` (full-text search)
- **B-tree** on org_id, source_id, status (filtering)

### SQL Functions
- `semantic_search_chunks()` - Vector similarity search
- `hybrid_search_chunks()` - Combined semantic + keyword
- `update_knowledge_source_stats()` - Auto-update triggers

---

## 🔌 API Endpoints

### Knowledge Sources
```
GET    /api/v1/knowledge/sources              # List all
POST   /api/v1/knowledge/sources              # Create
GET    /api/v1/knowledge/sources/{id}         # Get one
PATCH  /api/v1/knowledge/sources/{id}         # Update
DELETE /api/v1/knowledge/sources/{id}         # Delete
```

### Documents & Sync
```
GET  /api/v1/knowledge/sources/{id}/documents # List docs
POST /api/v1/knowledge/sources/{id}/upload    # Upload
POST /api/v1/knowledge/sources/{id}/sync      # Trigger sync
GET  /api/v1/knowledge/sources/{id}/sync-jobs # Sync history
```

### Search & Analytics
```
POST /api/v1/knowledge/search                       # Semantic search
GET  /api/v1/knowledge/templates                    # List templates
GET  /api/v1/knowledge/analytics/popular-queries    # Top queries
GET  /api/v1/knowledge/analytics/source-usage       # Usage stats
```

---

## 🎨 Frontend Pages (Planned)

### 1. Knowledge Sources List (`/admin/knowledge`)
- Grid of all knowledge sources
- Status indicators (active, syncing, failed)
- Quick stats (documents, chunks, last sync)
- Create source button → Template selector

### 2. Source Detail (`/admin/knowledge/[id]`)
**Tabs:**
- **Overview**: Config, stats, sync schedule
- **Documents**: List with upload, status, actions
- **Settings**: Embedding model, chunking, retrieval
- **Agents**: Which agents use this source
- **Analytics**: Search usage, popular queries

### 3. Knowledge Search (`/admin/knowledge/search`)
- Search bar with filters
- Result cards with scores, highlighting
- Source attribution
- Feedback buttons (helpful/not helpful)

### 4. Analytics Dashboard (`/admin/knowledge/analytics`)
- Popular queries (last 7/30 days)
- Source usage heatmap
- Search latency trends
- User feedback scores

---

## 🚀 Implementation Roadmap

### Week 1: Service Layer
- [ ] `KnowledgeService` class skeleton
- [ ] Source CRUD operations
- [ ] Document upload & processing
- [ ] Basic semantic search

### Week 2: Advanced Features
- [ ] Hybrid search implementation
- [ ] Reranking integration
- [ ] Sync job orchestration
- [ ] Background workers

### Week 3: Frontend
- [ ] Knowledge sources list page
- [ ] Source detail page
- [ ] Document management
- [ ] Search interface

### Week 4: Polish & Testing
- [ ] Analytics dashboard
- [ ] Unit tests (pytest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Performance optimization

---

## 🎓 Key Concepts

### Chunking Strategies
| Strategy | Best For |
|----------|----------|
| **Recursive** | General purpose, most content types |
| **Sentence** | Q&A, FAQs, short-form content |
| **Paragraph** | Articles, blogs, structured docs |
| **Semantic** | Technical docs, legal text (advanced) |

### Retrieval Strategies
| Strategy | Algorithm | Use Case |
|----------|-----------|----------|
| **Similarity** | Pure cosine similarity | Fast, simple queries |
| **Hybrid** | 70% semantic + 30% keyword | Best balance |
| **Keyword** | Full-text search only | Exact phrase matching |
| **MMR** | Diversity-aware | Avoid redundant results |

### Source Types
| Type | Examples | Integration |
|------|----------|-------------|
| **document** | PDF, DOCX, TXT | Upload via API |
| **database** | Supabase tables | SQL connector |
| **api** | REST endpoints | HTTP poller |
| **website** | Docs sites | Web crawler |
| **manual** | Direct text | Copy-paste UI |
| **integration** | Drive, Notion | OAuth + sync |

---

## 📊 Performance Guidelines

### Search Performance
- **Target Latency**: <200ms for semantic search (p95)
- **HNSW Index**: ~10x faster than IVFFlat
- **Batch Queries**: Use prepared functions
- **Cache**: Consider Redis for popular queries

### Sync Performance
- **Incremental Sync**: After initial full sync
- **Batch Size**: 100 docs/batch
- **Parallel Processing**: Use worker pools
- **Rate Limiting**: Respect API limits

### Storage Optimization
- **Deduplication**: Content hash matching
- **Compression**: gzip for large text chunks
- **Archival**: Move old chunks to cold storage
- **Cleanup**: Regular vacuum & reindex

---

## 🔗 Integration with Existing System

### RAG System (`server/rag.py`)
- ✅ Reuses embedding generation
- ✅ Compatible with existing chunks table
- ✅ Shares OpenAI client & rate limiting

### Agent System (Phases 1-5)
- ✅ `agent_knowledge_assignments` links agents to sources
- ✅ Per-agent retrieval configuration
- ✅ Knowledge filtering by agent permissions

### Authentication
- ✅ Uses existing `get_current_user()` dependency
- ✅ Organization-level isolation
- ✅ RLS policies enforce security

---

## 🧪 Testing Strategy

### Unit Tests
```python
# tests/knowledge/test_service.py
test_create_source()
test_upload_document()
test_semantic_search()
test_hybrid_search()
test_sync_job_orchestration()
```

### Integration Tests
```python
# tests/knowledge/test_routes.py
test_source_crud_workflow()
test_document_upload_and_processing()
test_search_with_filters()
test_sync_job_lifecycle()
```

### E2E Tests
```typescript
// tests/playwright/knowledge.spec.ts
test('create knowledge source from template')
test('upload and process document')
test('search knowledge base')
test('view analytics')
```

---

## 📖 Getting Started

### 1. Apply Migration
```bash
supabase db push
# or manually:
psql "$DATABASE_URL" -f supabase/migrations/20250115000000_agent_knowledge_system.sql
```

### 2. Verify Schema
```bash
psql "$DATABASE_URL" -c "\dt knowledge_*"
```

### 3. Read Documentation
1. Start with **PHASE_6_VISUAL_SUMMARY.md** for architecture
2. Read **PHASE_6_RAG_KNOWLEDGE_MANAGEMENT.md** for full guide
3. Use **PHASE_6_QUICK_REFERENCE.md** during development

### 4. Implement Service Layer
```bash
# Next step: Create service.py
touch server/api/v1/knowledge/service.py
```

---

## 🎯 Success Criteria

Phase 6 is complete when:
- ✅ Database schema applied and tested
- ✅ API fully functional (CRUD + search)
- ✅ Frontend admin pages working
- ✅ Background sync operational
- ✅ Tests passing (80%+ coverage)
- ✅ Performance benchmarks met (<200ms p95)
- ✅ Documentation complete

**Current Progress:** 30% (Database + Schemas)

---

## 🆘 Support & Resources

### Documentation
- **Full Guide**: PHASE_6_RAG_KNOWLEDGE_MANAGEMENT.md
- **Visual Overview**: PHASE_6_VISUAL_SUMMARY.md
- **Quick Reference**: PHASE_6_QUICK_REFERENCE.md

### Code References
- **Existing RAG**: `server/rag.py`
- **OpenAI Integration**: `server/openai_retrieval.py`
- **Database Models**: `server/db.py`

### Related Phases
- **Phase 5**: Agent admin foundation
- **AGENT-GUARDRAILS.md**: Safety policies
- **ARCHITECTURE.md**: Overall system design

---

**Phase 6 Foundation Complete! Ready for service layer implementation.** 🚀
