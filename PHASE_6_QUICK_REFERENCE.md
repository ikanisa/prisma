# Phase 6 Quick Reference - RAG & Knowledge Management

## 📁 Files Created

### Database
- `supabase/migrations/20250115000000_agent_knowledge_system.sql` - Complete schema

### Backend API
- `server/api/v1/knowledge/__init__.py` - Package init
- `server/api/v1/knowledge/schemas.py` - Pydantic models
- `server/api/v1/knowledge/routes.py` - API endpoints (skeleton)

### Documentation
- `PHASE_6_RAG_KNOWLEDGE_MANAGEMENT.md` - Comprehensive guide
- `PHASE_6_VISUAL_SUMMARY.md` - Visual overview

## 🗄️ Database Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `knowledge_sources` | Source registry | 6 types, auto-sync, embedding config |
| `knowledge_documents` | Documents | External ID, processing status |
| `knowledge_chunks` | Vector embeddings | HNSW index, 1536 dims |
| `agent_knowledge_assignments` | Agent → Source | Retrieval config per agent |
| `knowledge_sync_jobs` | Background jobs | Progress tracking, metrics |
| `knowledge_search_analytics` | Search history | Performance, feedback |
| `knowledge_source_templates` | Templates | 7 pre-built configs |

## 🔌 API Endpoints

```
Knowledge Sources:
  GET    /api/v1/knowledge/sources
  POST   /api/v1/knowledge/sources
  GET    /api/v1/knowledge/sources/{id}
  PATCH  /api/v1/knowledge/sources/{id}
  DELETE /api/v1/knowledge/sources/{id}

Documents:
  GET  /api/v1/knowledge/sources/{id}/documents
  POST /api/v1/knowledge/sources/{id}/upload

Sync:
  POST /api/v1/knowledge/sources/{id}/sync
  GET  /api/v1/knowledge/sources/{id}/sync-jobs

Search:
  POST /api/v1/knowledge/search

Templates & Analytics:
  GET /api/v1/knowledge/templates
  GET /api/v1/knowledge/analytics/popular-queries
  GET /api/v1/knowledge/analytics/source-usage
```

## 🎯 Source Types

1. **document** - Manual uploads (PDF, DOCX, TXT, MD)
2. **database** - Supabase tables, SQL queries
3. **api** - REST API endpoints
4. **website** - Web scraping
5. **manual** - Direct text entry
6. **integration** - Google Drive, Confluence, Notion

## 🔍 Retrieval Strategies

- **similarity** - Pure vector similarity (cosine)
- **hybrid** - Semantic (70%) + Keyword (30%)
- **keyword** - Full-text search only
- **mmr** - Maximal Marginal Relevance (diversity)

## 🧩 Chunking Strategies

- **recursive** - Token-based with overlap (default)
- **sentence** - Natural language boundaries
- **paragraph** - Structure preservation
- **semantic** - Meaning-based segmentation
- **custom** - User-defined logic

## 📊 Key SQL Functions

```sql
-- Semantic search
SELECT * FROM semantic_search_chunks(
  p_org_id := 'uuid',
  p_query_embedding := embedding_vector,
  p_knowledge_sources := ARRAY['uuid1', 'uuid2'],
  p_limit := 5,
  p_similarity_threshold := 0.70
);

-- Hybrid search (semantic + keyword)
SELECT * FROM hybrid_search_chunks(
  p_org_id := 'uuid',
  p_query_text := 'search query',
  p_query_embedding := embedding_vector,
  p_knowledge_sources := ARRAY['uuid1'],
  p_limit := 5,
  p_semantic_weight := 0.7
);
```

## 🚀 Quick Start Example

### 1. Create a Knowledge Source
```bash
curl -X POST /api/v1/knowledge/sources \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Company Policies",
    "slug": "company-policies",
    "source_type": "document",
    "chunk_size": 1000,
    "embedding_model": "text-embedding-3-small"
  }'
```

### 2. Upload a Document
```bash
curl -X POST /api/v1/knowledge/sources/{id}/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@employee_handbook.pdf"
```

### 3. Search
```bash
curl -X POST /api/v1/knowledge/search \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "What is the vacation policy?",
    "top_k": 5,
    "retrieval_strategy": "hybrid",
    "similarity_threshold": 0.75
  }'
```

## ✅ Completed

- ✅ Database schema with 7 tables
- ✅ HNSW vector indexes
- ✅ SQL helper functions
- ✅ Pydantic schemas
- ✅ API route definitions
- ✅ 7 pre-configured templates
- ✅ RLS policies
- ✅ Automatic triggers
- ✅ Comprehensive documentation

## ⏳ TODO (Next Phase)

- [ ] `KnowledgeService` class implementation
- [ ] Document processing pipeline
- [ ] Sync job orchestration
- [ ] Frontend admin pages
- [ ] React hooks (useKnowledge)
- [ ] Background workers
- [ ] Unit & integration tests

## 📖 Documentation Files

- **PHASE_6_RAG_KNOWLEDGE_MANAGEMENT.md** - Full implementation guide
- **PHASE_6_VISUAL_SUMMARY.md** - Visual architecture overview
- **PHASE_6_QUICK_REFERENCE.md** - This file

## 🔗 Integration Points

### With Existing RAG System
- Uses `server/rag.py` for embeddings
- Integrates with `server/openai_retrieval.py`
- Compatible with existing `chunks` table

### With Agent System
- `agent_knowledge_assignments` table
- Per-agent retrieval configuration
- Knowledge filtering by permissions

## 💾 Storage Estimates

| Scale | Embeddings | Text | Total |
|-------|-----------|------|-------|
| 1K docs (10 chunks/doc) | 60 MB | 50-100 MB | 130-200 MB |
| 10K docs | 600 MB | 500 MB-1 GB | 1.3-2 GB |
| 100K docs | 6 GB | 5-10 GB | 13-20 GB |

## 🎓 Best Practices

1. **Chunking**: Use 1000 tokens with 200 overlap for most content
2. **Embedding Model**: `text-embedding-3-small` for cost/performance balance
3. **Retrieval**: Start with `hybrid` strategy for best results
4. **Sync**: Use `incremental` for large sources after initial `full_sync`
5. **Reranking**: Enable for better result quality (slight latency cost)

## 🐛 Troubleshooting

### Issue: Slow Search
- Check HNSW index exists: `\d knowledge_chunks`
- Verify index is being used: `EXPLAIN ANALYZE SELECT ...`
- Reduce `top_k` or increase `similarity_threshold`

### Issue: Sync Failures
- Check `knowledge_sync_jobs.error_message`
- Verify source credentials in `source_config`
- Ensure sufficient disk space for documents

### Issue: Poor Results
- Increase `chunk_overlap` for better context
- Try different `chunking_strategy`
- Lower `similarity_threshold`
- Use `hybrid` instead of pure `similarity`

---

**Ready for Phase 6 service layer implementation!** 🚀
