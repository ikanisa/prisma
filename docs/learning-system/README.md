# Agent Learning System - Implementation Guide

## Overview

The Agent Learning System enables continuous improvement of AI agents through:
- **Feedback Collection**: User ratings and corrections
- **Expert Annotation**: Quality assessment by domain experts
- **Training Data Management**: Curated datasets for improvement
- **Automated Training**: Prompt optimization, RAG tuning, fine-tuning
- **A/B Experimentation**: Safe testing of improvements

## Architecture

```
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

## Quick Start

### 1. Apply Database Migration

```bash
psql $DATABASE_URL -f migrations/sql/20251128133000_agent_learning_system.sql

# Verify
psql $DATABASE_URL -c "\dt learning_*"
```

### 2. Integrate Feedback UI

```tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

<FeedbackCollector
  executionId={execution.id}
  agentId={execution.agentId}
  agentOutput={execution.output}
/>
```

### 3. Use Learning Engines

```python
from server.learning import PromptOptimizer

optimizer = PromptOptimizer(agent_id, db, llm)
result = await optimizer.optimize(
    current_prompt=agent.system_prompt,
    learning_examples=examples,
    optimization_goals=['accuracy', 'completeness']
)
```

## Database Schema

### Core Tables

- **learning_examples**: Training data from feedback/demonstrations
- **agent_feedback**: Quick user ratings
- **expert_annotations**: Expert quality assessments
- **training_datasets**: Curated datasets
- **training_runs**: Training executions
- **learning_experiments**: A/B experiments

## API Endpoints

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
-- System health
SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as feedback_last_week,
    COUNT(*) FILTER (WHERE review_status = 'pending') as pending_review,
    AVG(quality_score) FILTER (WHERE review_status = 'approved') as avg_quality
FROM learning_examples;
```

## Resources

- **Migration**: `migrations/sql/20251128133000_agent_learning_system.sql`
- **Python**: `server/learning/`
- **React**: `src/components/learning/`
- **API**: `server/api/learning.py`

---

**Version**: 1.0 | **Status**: Ready | **Updated**: 2025-11-28
