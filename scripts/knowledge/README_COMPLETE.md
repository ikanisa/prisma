# Accounting Knowledge Base System - Complete Guide

**Version**: 1.1.0 (Extended Edition)  
**Status**: Production Ready ✅  
**Total Files**: 19 files, ~130 KB

---

## 🎯 What Is This?

A complete **Retrieval-Augmented Generation (RAG)** system for accounting, auditing, and tax knowledge. Built for Prisma Glow platform to provide AI-powered answers based on authoritative sources like IFRS, IAS, ISA, GAAP, and tax laws.

### Key Features

✅ **Semantic Search** - pgvector-powered similarity search  
✅ **10 Pre-loaded Sources** - IFRS, IAS, ISA, Rwanda tax, ACCA  
✅ **Authority Ranking** - PRIMARY > INTERNAL > SECONDARY  
✅ **Jurisdiction Filtering** - Rwanda, EU, US, Global support  
✅ **Citation Generation** - Automatic source references  
✅ **Confidence Scoring** - 0-1 scale for answer reliability  
✅ **Full Audit Trail** - All queries logged  
✅ **TypeScript Implementation** - Complete agent classes  
✅ **Management CLI** - 7 commands for maintenance  
✅ **Docker Support** - Ready for containerized deployment  

---

## 📦 What's Included

### Core System (15 files)
1. **Database Schema** - PostgreSQL + pgvector migration
2. **YAML Configurations** - 4 files (pipeline, agents, rules)
3. **TypeScript Scripts** - 7 files (ingest, search, agent, manage, examples, tests)
4. **Documentation** - 3 comprehensive guides
5. **Visual Map** - System overview diagram

### New in v1.1.0 (4 additional files)
6. **package.json** - npm scripts for easy commands
7. **Docker Setup** - Dockerfile + docker-compose.yml
8. **Deploy Script** - Automated deployment
9. **Test Suite** - Comprehensive testing (30+ tests)

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Setup (5 minutes)
cd /Users/jeanbosco/workspace/prisma/scripts/knowledge
make kb-setup

# 2. Ingest (10 minutes)
make kb-ingest

# 3. Test (2 minutes)
make kb-test
```

**Or using the deploy script:**

```bash
chmod +x scripts/knowledge/deploy.sh
./scripts/knowledge/deploy.sh
```

---

## 📚 File Structure

```
prisma/
├── supabase/migrations/
│   └── 20251201170000_accounting_knowledge_base.sql
│
├── config/knowledge/
│   ├── ingest-pipeline.yaml
│   ├── deepsearch-agent.yaml
│   ├── accountant-ai-agent.yaml
│   ├── retrieval-rules.yaml
│   └── QUICK_START.md
│
├── scripts/knowledge/
│   ├── ingest.ts                 # Ingestion pipeline
│   ├── test-search.ts            # Search testing
│   ├── deepsearch-agent.ts       # Agent implementation
│   ├── manage.ts                 # Management CLI
│   ├── examples.ts               # Usage examples
│   ├── test-suite.ts             # Test suite ✨ NEW
│   ├── deploy.sh                 # Deploy script ✨ NEW
│   ├── Dockerfile                # Docker build ✨ NEW
│   ├── docker-compose.yml        # Docker services ✨ NEW
│   ├── package.json              # npm scripts ✨ NEW
│   ├── Makefile                  # Quick commands
│   ├── README.md                 # This file
│   └── INTEGRATION_GUIDE.md      # Integration patterns
│
├── ACCOUNTING_KNOWLEDGE_BASE_SUMMARY.md
└── ACCOUNTING_KB_VISUAL_MAP.txt
```

---

## 💻 Commands Reference

### Using Makefile

```bash
# Setup & Deploy
make kb-setup        # Install deps + run migration
make kb-migrate      # Apply migration only
make kb-deploy       # Full deployment

# Data Management
make kb-ingest       # Ingest all sources (~15 min)
make kb-list         # List all sources
make kb-stats        # Show statistics

# Testing
make kb-test         # Test search
make kb-test-all     # Run all test queries
make kb-examples     # Run 8 examples
make kb-test-suite   # Run comprehensive tests ✨ NEW

# Maintenance
make kb-freshness    # Check document staleness
make kb-clean        # Cleanup old docs (dry-run)
make kb-backup       # Export to JSON

# Docker ✨ NEW
make kb-docker-build # Build Docker image
make kb-docker-up    # Start services
make kb-docker-down  # Stop services
```

### Using npm Scripts

```bash
# Setup
pnpm run knowledge:setup
pnpm run knowledge:migrate

# Usage
pnpm run knowledge:ingest
pnpm run knowledge:search "Your question"
pnpm run knowledge:stats

# Management
pnpm run knowledge:list
pnpm run knowledge:cleanup
pnpm run knowledge:freshness
pnpm run knowledge:backup

# Examples & Tests
pnpm run knowledge:examples
pnpm run knowledge:test-suite  # ✨ NEW
```

---

## 🔧 Usage Examples

### 1. Basic Search

```typescript
import { DeepSearchAgent } from './scripts/knowledge/deepsearch-agent';

const agent = new DeepSearchAgent({ supabase, openai });

const result = await agent.search({
  query: "How do I account for foreign exchange gains?",
  types: ["IFRS", "IAS"],
  jurisdiction: "RW"
});

console.log(result.answer);      // AI answer
console.log(result.sources);     // Citations
console.log(result.confidence);  // 0-1 score
```

### 2. Command Line

```bash
# Single query
pnpm tsx scripts/knowledge/test-search.ts "How do I recognize revenue?"

# Show stats
pnpm tsx scripts/knowledge/test-search.ts --stats

# Run all tests
pnpm tsx scripts/knowledge/test-search.ts --test-all
```

### 3. Management CLI

```bash
# List sources by type
pnpm tsx scripts/knowledge/manage.ts list-sources --type IFRS

# Check freshness
pnpm tsx scripts/knowledge/manage.ts check-freshness --threshold 180

# Cleanup old documents
pnpm tsx scripts/knowledge/manage.ts cleanup --older-than 730

# Refresh embeddings
pnpm tsx scripts/knowledge/manage.ts refresh-embeddings --document-id <uuid>

# Export backup
pnpm tsx scripts/knowledge/manage.ts export-sources -o backup.json
```

### 4. Run Examples

```bash
# Run all 8 examples
pnpm tsx scripts/knowledge/examples.ts

# Run specific example
pnpm tsx scripts/knowledge/examples.ts basic
pnpm tsx scripts/knowledge/examples.ts chat
pnpm tsx scripts/knowledge/examples.ts batch
```

---

## 🐳 Docker Deployment

### Build and Run

```bash
# Build image
docker build -t prisma-knowledge-api -f scripts/knowledge/Dockerfile .

# Run with docker-compose
cd scripts/knowledge
docker-compose up -d

# Check logs
docker-compose logs -f knowledge-api

# Stop services
docker-compose down
```

### Environment Variables

Create a `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
DATABASE_URL=postgresql://...
POSTGRES_PASSWORD=your-secure-password
KNOWLEDGE_API_PORT=3002
POSTGRES_PORT=5432
REDIS_PORT=6379
```

### API Endpoints

```bash
# Health check
curl http://localhost:3002/health

# Search
curl -X POST http://localhost:3002/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query":"How do I account for leases?","topK":5}'

# Stats
curl http://localhost:3002/api/knowledge/stats
```

---

## 🧪 Testing

### Run Test Suite

```bash
# Full test suite (30+ tests)
pnpm tsx scripts/knowledge/test-suite.ts

# Tests include:
# ✓ Database connection
# ✓ Data ingestion verification
# ✓ Search functionality
# ✓ Agent operations
# ✓ Performance benchmarks
# ✓ Edge cases
```

### Expected Output

```
╔══════════════════════════════════════════════════════════════════╗
║      ACCOUNTING KNOWLEDGE BASE - COMPREHENSIVE TEST SUITE        ║
╚══════════════════════════════════════════════════════════════════╝

📊 Database Connection Tests
✓ Database connection (42ms)
✓ Jurisdictions table exists (18ms)
✓ Knowledge sources table exists (15ms)
...

🎉 All tests passed!
Total Tests: 32
Passed: 32 ✓
Failed: 0 ✗
Success Rate: 100.0%
```

---

## 📖 Documentation

### Getting Started
- **config/knowledge/QUICK_START.md** - 15-minute setup guide
- **scripts/knowledge/README.md** - This file (comprehensive)
- **ACCOUNTING_KNOWLEDGE_BASE_SUMMARY.md** - Implementation summary

### Integration
- **scripts/knowledge/INTEGRATION_GUIDE.md** - Complete integration patterns
- **scripts/knowledge/examples.ts** - 8 working code examples

### Configuration
- **config/knowledge/deepsearch-agent.yaml** - Retrieval agent spec
- **config/knowledge/accountant-ai-agent.yaml** - Assistant agent spec
- **config/knowledge/retrieval-rules.yaml** - Ranking logic
- **config/knowledge/ingest-pipeline.yaml** - Ingestion pipeline

### Visual
- **ACCOUNTING_KB_VISUAL_MAP.txt** - System overview diagram

---

## 🔐 Production Checklist

- [ ] Set all environment variables securely
- [ ] Apply database migration
- [ ] Ingest knowledge sources
- [ ] Run test suite (all tests pass)
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerting
- [ ] Enable query caching (Redis)
- [ ] Schedule weekly freshness checks
- [ ] Schedule quarterly re-ingestion
- [ ] Set up backup automation
- [ ] Configure log aggregation
- [ ] Review security settings

---

## 📊 Monitoring

### Query Analytics

```sql
-- Popular queries
SELECT query_text, COUNT(*) as count
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_text
ORDER BY count DESC
LIMIT 20;

-- Performance metrics
SELECT
  agent_name,
  AVG(latency_ms) as avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency
FROM agent_queries_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY agent_name;
```

### Knowledge Coverage

```sql
-- Documents by type and authority
SELECT
  ks.type,
  ks.authority_level,
  COUNT(DISTINCT kd.id) as documents,
  COUNT(kc.id) as chunks
FROM knowledge_sources ks
LEFT JOIN knowledge_documents kd ON kd.source_id = ks.id
LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
GROUP BY ks.type, ks.authority_level;
```

---

## 💡 Best Practices

1. **Start Small** - Ingest 2-3 documents first, test thoroughly
2. **Monitor Costs** - Track OpenAI API usage (~$0.00002 per 1K tokens)
3. **Cache Aggressively** - Use Redis for frequent queries (1-hour TTL)
4. **Version Standards** - Track which version of each standard
5. **Audit Everything** - Always log queries for compliance
6. **Update Quarterly** - Tax laws change; re-ingest regularly
7. **Validate Citations** - Implement verification checks
8. **Human Oversight** - Flag low-confidence (<0.7) for review

---

## 🆘 Troubleshooting

### Issue: "No results found"

```bash
# Check if data is ingested
pnpm tsx scripts/knowledge/manage.ts stats

# Lower similarity threshold
# In your search: minSimilarity: 0.65
```

### Issue: "Slow queries"

```bash
# Check indexes
psql $DATABASE_URL -c "SELECT * FROM pg_indexes WHERE tablename = 'knowledge_embeddings';"

# Adjust IVFFlat parameters in migration
```

### Issue: "pdf-parse not found"

```bash
pnpm add pdf-parse canvas
```

---

## 🔗 Resources

**Standards & Documentation**
- IFRS: https://www.ifrs.org/
- ISA: https://www.iaasb.org/
- Rwanda Revenue: https://www.rra.gov.rw/
- ACCA: https://www.accaglobal.com/

**Technical**
- pgvector: https://github.com/pgvector/pgvector
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- Supabase: https://supabase.com/docs

---

## 📝 Changelog

### v1.1.0 (2025-12-01) - Extended Edition
- ✨ Added DeepSearch agent TypeScript implementation
- ✨ Added Management CLI with 7 commands
- ✨ Added 8 usage examples
- ✨ Added comprehensive test suite (30+ tests)
- ✨ Added Docker support (Dockerfile + compose)
- ✨ Added deployment script
- ✨ Added package.json with npm scripts
- ✨ Added integration guide
- 📝 Enhanced documentation

### v1.0.0 (2025-12-01) - Initial Release
- 🎉 Complete database schema with pgvector
- 🎉 YAML configurations for pipeline and agents
- 🎉 TypeScript ingestion script
- 🎉 Test and search utilities
- 🎉 Comprehensive documentation

---

## 🎉 Summary

You now have a **complete, production-ready** accounting knowledge base system with:

- ✅ 19 files (~130 KB)
- ✅ Full PostgreSQL schema
- ✅ TypeScript implementation
- ✅ Management tools
- ✅ Docker support
- ✅ Comprehensive tests
- ✅ Complete documentation

**Ready for immediate deployment and use!** 🚀

---

**Generated**: December 1, 2025  
**Project**: Prisma Glow  
**System**: Accounting Knowledge Base  
**Version**: 1.1.0 (Extended Edition)
