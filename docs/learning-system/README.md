# Agent Learning System - Implementation Guide

## Overview

The Agent Learning System enables continuous improvement of AI agents through:
- **Feedback Collection**: User ratings and corrections
- **Expert Annotation**: Quality assessment by domain experts
- **Training Data Management**: Curated datasets for improvement
- **Automated Training**: Prompt optimization, RAG tuning, fine-tuning
- **A/B Experimentation**: Safe testing of improvements
- **Deep Search**: Authoritative source retrieval with guardrails
- **Curated Knowledge Base (CKB)**: Structured knowledge library with metadata

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   KNOWLEDGE ACCESS LAYERS                    │
│  L1: Native LLM Memory (not trusted as final reference)     │
│  L2: Verified Knowledge Base (RAG with citations)           │
│  L3: Deep Search (triggered when sources missing/outdated)  │
│  L4: Reasoning Validators (conflict detection, escalation)  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATA COLLECTION LAYER                      │
│  User Feedback → Expert Corrections → System Telemetry      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATA PROCESSING LAYER                      │
│  Quality Filtering → Annotation → Dataset Management        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    LEARNING ENGINE LAYER                     │
│  Prompt Optimizer → RAG Trainer → Behavior Learner          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    EVALUATION LAYER                          │
│  A/B Testing → Regression Testing → Safety Validation       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT LAYER                          │
│  Canary Release → Gradual Rollout → Monitoring              │
└─────────────────────────────────────────────────────────────┘
```

## Deep Search + Curated Knowledge Base

### Knowledge Architecture

The knowledge system follows a structured hierarchy:

```
curated_knowledge_base
    id
    title
    type: ["IFRS", "IAS", "ISA", "GAAP", "Tax Law", "ACCA", "CPA", "Internal"]
    jurisdiction
    effective_date
    version
    tags (array)
    source_url
    summary
    full_text (chunked for RAG)
    embeddings_vector
    verification_level: ["primary", "secondary"]
    updated_at
```

### Authoritative Sources (Primary)

- **IFRS Foundation**: Official IFRS standards
- **IAASB**: International auditing standards (ISA)
- **OECD**: International tax guidelines (BEPS)
- **Tax Authorities**: National revenue authorities (RRA, CFR, IRS)
- **National Gazettes**: Public statutes and laws

### Interpretation Sources (Secondary)

- **Big Four**: PwC, KPMG, EY, Deloitte summaries
- **ACCA/CPA**: Study materials and guidance
- **Academic**: University accounting resources

### Retrieval Guardrails

Before responding, agents must:
1. Fetch relevant chunks from CKB
2. Cross-check with Deep Search if sources are outdated
3. Add citations with specific clause references
4. Include reasoning trace (hidden from user, visible for audit)

### Source Priority Rules

1. **Primary sources override secondary** - IFRS > Big Four summaries
2. **Local laws override global for tax** - RRA regulations > OECD guidelines
3. **IFRS overrides GAAP when adopted**
4. **Interpretations must cite clauses** - Reference "IAS 21.28-37" not just "IAS 21"
5. **Deep Search when unsure** - Triggered automatically on outdated sources

## Quick Start

### 1. Apply Database Migrations

```bash
# Curated Knowledge Base schema
psql $DATABASE_URL -f supabase/migrations/20260201100000_curated_knowledge_base.sql

# Verify
psql $DATABASE_URL -c "\dt curated_knowledge_base"
psql $DATABASE_URL -c "\dt deep_search_sources"
psql $DATABASE_URL -c "\dt retrieval_guardrails"
psql $DATABASE_URL -c "\dt agent_reasoning_traces"
```

### 2. Search the Knowledge Base

```python
from server.api.deep_search import DeepSearchRequest, perform_deep_search

# Perform Deep Search across authoritative sources
request = DeepSearchRequest(
    query="How to treat foreign exchange revaluation gains under IFRS?",
    jurisdictions=["INTL", "MT"],  # International + Malta
    domains=["financial_reporting"],
    include_secondary=True  # Include Big Four interpretations
)

response = await perform_deep_search(request)
print(f"Found {response.total_results} results from {len(response.sources_queried)} sources")
print(f"Has authoritative sources: {response.has_authoritative_sources}")
```

### 3. Check Guardrails Before Response

```python
from server.api.deep_search import GuardrailCheckRequest, check_guardrails

# Check guardrails before agent response
check = GuardrailCheckRequest(
    org_id=org_id,
    domain="tax",
    sources_found=5,
    confidence_score=0.85,
    has_jurisdiction_match=True,
    max_source_age_days=25
)

result = await check_guardrails(check)
if not result.all_passed:
    if result.should_trigger_deep_search:
        # Perform Deep Search for updated sources
        pass
    if result.requires_escalation:
        # Escalate to human reviewer
        pass
```

### 4. Log Reasoning Trace for Audit

```python
# All agent reasoning is logged for audit (hidden from users)
trace = CreateReasoningTraceRequest(
    agent_id=agent_id,
    query_text="How to treat FX gains?",
    reasoning_steps=[
        {"step": 1, "action": "identify_topic", "result": "FX → IAS 21"},
        {"step": 2, "action": "retrieve_sources", "chunks": ["uuid1", "uuid2"]},
        {"step": 3, "action": "check_jurisdiction", "result": "Malta tax treatment needed"},
        {"step": 4, "action": "apply_reasoning", "citations": ["IAS 21.28-37"]},
    ],
    sources_consulted=["uuid1", "uuid2"],
    final_answer="FX gains should be recognized...",
    citations=[{"source": "IAS 21", "clause": "21.28-37", "text": "..."}],
    confidence_score=0.92
)
```

## Database Schema

### Core Tables

- **curated_knowledge_base**: Structured knowledge entries with metadata
- **deep_search_sources**: Registry of authoritative sources
- **retrieval_guardrails**: Validation rules before agent responses
- **agent_reasoning_traces**: Audit trail of reasoning steps
- **learning_examples**: Training data from feedback/demonstrations
- **agent_feedback**: Quick user ratings
- **expert_annotations**: Expert quality assessments
- **training_datasets**: Curated datasets
- **training_runs**: Training executions
- **learning_experiments**: A/B experiments

## API Endpoints

### Deep Search & Knowledge
- `POST /api/v1/deep-search/search` - Perform Deep Search
- `POST /api/v1/deep-search/check-guardrails` - Check guardrails
- `POST /api/v1/deep-search/log-reasoning-trace` - Log reasoning trace
- `GET /api/v1/deep-search/sources` - List authoritative sources
- `GET /api/v1/deep-search/stats` - Get knowledge base statistics

### Feedback
- `POST /api/learning/feedback` - Submit feedback
- `GET /api/learning/stats` - Get statistics

### Annotation
- `GET /api/learning/annotation-queue` - Get pending examples
- `POST /api/learning/annotations` - Submit annotation

### Training
- `POST /api/learning/training-runs` - Start training
- `GET /api/learning/training-runs` - Get history

### Experimentation
- `POST /api/learning/experiments` - Create experiment
- `GET /api/learning/experiments` - List experiments

## Learning Engines

### 1. Prompt Optimizer

Improves prompts through:
- Instruction clarification
- Few-shot example addition
- Structure optimization
- A/B testing

### 2. RAG Trainer

Improves retrieval through:
- Chunk relevance scoring
- Embedding fine-tuning
- Query expansion
- Chunking optimization

### 3. Behavior Learner

Learns from experts through:
- Demonstration capture
- Pattern extraction
- Workflow cloning
- Mistake avoidance

## Best Practices

### Knowledge Base Management
✅ Primary sources override secondary  
✅ Always cite specific clauses (IAS 21.28-37)  
✅ Update sources within 30 days  
✅ Log all reasoning for audit  

### Feedback Collection
✅ Place UI prominently  
✅ Make thumbs up/down 1-click  
✅ Offer detailed feedback option  
✅ Capture corrections  

### Expert Annotation
✅ Schedule dedicated time  
✅ Focus on high-impact examples  
✅ Provide guidelines  
✅ Review agreement  

### Safe Deployment
✅ Always A/B test  
✅ Monitor metrics  
✅ Have rollback plan  
✅ Gradual rollout  

## Monitoring

```sql
-- Knowledge Base health
SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE is_outdated) as outdated_entries,
    COUNT(*) FILTER (WHERE verification_level = 'primary') as primary_sources,
    COUNT(*) FILTER (WHERE verification_level = 'secondary') as secondary_sources
FROM curated_knowledge_base
WHERE is_active = true;

-- Reasoning traces requiring review
SELECT 
    COUNT(*) as pending_review,
    AVG(confidence_score) as avg_confidence
FROM agent_reasoning_traces
WHERE requires_review = true AND reviewed_at IS NULL;

-- System health
SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as feedback_last_week,
    COUNT(*) FILTER (WHERE review_status = 'pending') as pending_review,
    AVG(quality_score) FILTER (WHERE review_status = 'approved') as avg_quality
FROM learning_examples;
```

## Resources

- **CKB Migration**: `supabase/migrations/20260201100000_curated_knowledge_base.sql`
- **Deep Search API**: `server/api/deep_search.py`
- **TypeScript Types**: `services/rag/types/curated-knowledge-base.ts`
- **TypeScript Service**: `services/rag/curated-knowledge-base.ts`
- **Python Learning**: `server/learning/`
- **React Components**: `src/components/learning/`
- **API**: `server/api/learning.py`

---

**Version**: 2.0 | **Status**: Ready | **Updated**: 2025-12-01
