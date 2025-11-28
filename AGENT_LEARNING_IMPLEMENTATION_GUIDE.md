# AGENT LEARNING SYSTEM - IMPLEMENTATION GUIDE

## Quick Start (30 Minutes)

### Step 1: Apply Database Migration (5 minutes)

```bash
# Apply the learning system schema
psql "$DATABASE_URL" -f migrations/sql/20251128130000_agent_learning_system.sql

# Verify tables were created
psql "$DATABASE_URL" -c "\dt learning_examples agent_feedback expert_annotations training_datasets"
```

### Step 2: Install Dependencies (2 minutes)

```bash
# Already part of the main installation
pnpm install --frozen-lockfile
```

### Step 3: Start Collecting Feedback (10 minutes)

Add the FeedbackCollector component to your agent output UI:

```tsx
// In your agent response component
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

export function AgentResponse({ execution }) {
  return (
    <div>
      {/* Your agent output display */}
      <div className="agent-output">{execution.output}</div>
      
      {/* Add feedback collection */}
      <FeedbackCollector
        executionId={execution.id}
        agentId={execution.agent_id}
        agentOutput={execution.output}
        onFeedbackSubmitted={() => {
          console.log('Feedback submitted!');
        }}
      />
    </div>
  );
}
```

### Step 4: Enable API Endpoints (5 minutes)

Add the learning router to your FastAPI main app:

```python
# server/main.py
from server.api.learning import router as learning_router

app.include_router(learning_router)
```

### Step 5: Access the Dashboard (8 minutes)

```bash
# Start the development server
pnpm dev

# Navigate to the learning dashboard
open http://localhost:5173/admin/learning
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA COLLECTION                          │
│  User Feedback → Expert Annotations → Training Examples    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 LEARNING ENGINES                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Prompt   │  │   RAG    │  │ Behavior │  │  Fine-   │   │
│  │Optimizer │  │ Trainer  │  │ Learner  │  │  Tuning  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   EVALUATION & TESTING                       │
│  A/B Tests → Metrics → Safety Checks → Gradual Rollout     │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Database Schema

**8 Main Tables:**

- `learning_examples`: Core training data from all sources
- `agent_feedback`: Quick user ratings and corrections
- `expert_annotations`: Detailed quality assessments
- `training_datasets`: Curated collections for training
- `dataset_examples`: Links examples to datasets
- `training_runs`: Training job execution records
- `learning_experiments`: A/B testing experiments
- `embedding_training_pairs`: RAG improvement data

### 2. Frontend Components

**Location:** `src/components/learning/`

- `FeedbackCollector.tsx`: User feedback widget
- `LearningDashboard.tsx`: Admin overview (already exists)
- `AgentOutputCard.tsx`: Enhanced output display

**Location:** `src/pages/admin/`

- `LearningDashboard.tsx`: Main admin interface
- `AnnotationPage.tsx`: Expert annotation workflow

**Location:** `src/hooks/learning/`

- `useFeedback.ts`: React hooks for learning APIs

### 3. Backend Services

**Location:** `server/learning/`

- `prompt_optimizer.py`: Optimizes system prompts
- `rag_trainer.py`: Improves retrieval quality
- `behavior_learner.py`: Learns from demonstrations
- `feedback_collector.py`: Processes user feedback

**Location:** `server/api/`

- `learning.py`: FastAPI endpoints

## Learning Workflows

### Workflow 1: Feedback → Learning Example

```
User clicks thumbs down
    ↓
Provides detailed feedback & correction
    ↓
System creates learning_example record
    ↓
Expert reviews and annotates
    ↓
Approved example added to training dataset
    ↓
Next training run uses improved data
```

### Workflow 2: Prompt Optimization

```python
# Run optimization
from server.learning.prompt_optimizer import PromptOptimizer

optimizer = PromptOptimizer(agent_id, db, llm_client)

result = await optimizer.optimize(
    current_prompt="Your current system prompt...",
    learning_examples=approved_examples,
    optimization_goals=['accuracy', 'clarity']
)

# Review results
print(f"Improvement: {result.improvement_percentage}%")
print(f"Best variant: {result.best_variant.id}")
print(f"Recommendations: {result.recommendations}")
```

### Workflow 3: RAG Training

```python
from server.learning.rag_trainer import RAGTrainer

trainer = RAGTrainer(embedding_model, vector_store, db)

# Train from feedback
improvements = await trainer.train_from_feedback(feedback_batch)

# Optimize chunking
results = await trainer.optimize_chunking(
    document_id="doc_123",
    retrieval_logs=recent_logs
)
```

### Workflow 4: A/B Testing

```python
# Create experiment
experiment = {
    "name": "New prompt template",
    "hypothesis": "More structured prompts improve accuracy",
    "agent_id": "agent_123",
    "control_config": {"prompt": "old_template"},
    "treatment_config": {"prompt": "new_template"},
    "control_percentage": 50,
    "treatment_percentage": 50
}

# API will automatically route 50% of traffic to each variant
# and collect metrics
```

## API Endpoints

### Feedback

```bash
# Submit feedback
POST /api/learning/feedback
{
  "execution_id": "uuid",
  "agent_id": "uuid",
  "feedback_type": "thumbs_down",
  "rating": 2,
  "issue_categories": ["incorrect", "incomplete"],
  "correction_text": "The corrected output..."
}

# Get feedback stats
GET /api/learning/feedback/stats?agent_id=uuid&days=30
```

### Annotations

```bash
# Get annotation queue
GET /api/learning/annotation-queue?status=pending&limit=50

# Submit annotation
POST /api/learning/annotations
{
  "example_id": "uuid",
  "approved": true,
  "technical_accuracy": 0.9,
  "professional_quality": 0.85,
  "completeness": 0.8,
  "clarity": 0.9,
  "notes": "Excellent example..."
}
```

### Training

```bash
# Create training run
POST /api/learning/training-runs
{
  "name": "Monthly prompt optimization",
  "agent_id": "uuid",
  "dataset_id": "uuid",
  "training_type": "prompt_optimization",
  "config": {...}
}

# List training runs
GET /api/learning/training-runs?agent_id=uuid&status=completed
```

### Experiments

```bash
# Create A/B experiment
POST /api/learning/experiments
{
  "name": "Test new prompt",
  "agent_id": "uuid",
  "control_config": {...},
  "treatment_config": {...}
}

# List experiments
GET /api/learning/experiments?status=running
```

## Configuration

### Environment Variables

```bash
# .env
LEARNING_ENABLED=true
ANNOTATION_QUEUE_SIZE=100
AUTO_TRAINING_ENABLED=false
MIN_EXAMPLES_FOR_TRAINING=50
A_B_TEST_MIN_SAMPLES=1000
```

### System Config

```yaml
# config/system.yaml
learning:
  feedback:
    enabled: true
    require_rating: false
    enable_corrections: true
    
  annotation:
    auto_assign: false
    min_quality_score: 0.7
    require_expert_review: true
    
  training:
    auto_schedule: false
    min_dataset_size: 100
    max_training_hours: 6
    
  experiments:
    default_duration_days: 7
    min_sample_size: 1000
    auto_deploy_winner: false
```

## Testing

### Unit Tests

```bash
# Python backend tests
pytest server/learning/tests/

# React component tests
pnpm test src/components/learning/
```

### Integration Tests

```bash
# Full workflow test
pytest tests/integration/test_learning_workflow.py

# API endpoint tests
pytest tests/api/test_learning_endpoints.py
```

## Monitoring

### Key Metrics

Monitor these in your observability platform:

```python
# Prometheus metrics
learning_examples_total{source="user_feedback"}
learning_examples_total{source="expert_review"}
annotation_queue_depth
training_runs_total{status="completed"}
training_runs_total{status="failed"}
experiments_active_count
feedback_rating_avg{agent_id="..."}
```

### Dashboard Queries

```sql
-- Daily feedback volume
SELECT DATE(created_at), COUNT(*), AVG(rating)
FROM agent_feedback
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- Annotation throughput
SELECT expert_id, COUNT(*) as annotations_count
FROM expert_annotations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY expert_id
ORDER BY annotations_count DESC;

-- Training success rate
SELECT
  training_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful
FROM training_runs
GROUP BY training_type;
```

## Best Practices

### 1. Data Quality

- ✅ Set minimum quality scores for training data
- ✅ Require expert review for corrections
- ✅ Balance positive and negative examples
- ✅ Regularly audit training datasets

### 2. Training Cadence

- **Prompt Learning**: Continuous or daily
- **RAG Training**: Daily to weekly
- **Behavior Learning**: Weekly batches
- **Fine-Tuning**: Monthly or as needed

### 3. A/B Testing

- Run experiments for at least 1 week
- Collect minimum 1000 samples per variant
- Measure statistical significance
- Have rollback plan ready

### 4. Security & Privacy

- Anonymize user feedback data
- Require authentication for annotations
- Encrypt training artifacts
- Implement RLS policies on all tables

## Troubleshooting

### Issue: Feedback not appearing in queue

**Solution:**
```sql
-- Check if feedback was recorded
SELECT * FROM agent_feedback ORDER BY created_at DESC LIMIT 10;

-- Check learning_examples status
SELECT review_status, COUNT(*) FROM learning_examples GROUP BY review_status;
```

### Issue: Training run stuck

**Solution:**
```python
# Check training run status
SELECT * FROM training_runs WHERE status = 'running' AND started_at < NOW() - INTERVAL '24 hours';

# Manually mark as failed
UPDATE training_runs SET status = 'failed' WHERE id = 'stuck_run_id';
```

### Issue: Low annotation throughput

**Solution:**
- Reduce queue size filter
- Simplify annotation interface
- Add annotation incentives
- Use active learning to prioritize valuable examples

## Next Steps

1. **Week 1**: Deploy feedback collection
2. **Week 2**: Train annotators, build initial datasets
3. **Week 3**: Run first prompt optimization
4. **Week 4**: Launch A/B experiment
5. **Month 2**: Enable automated training
6. **Month 3**: Implement fine-tuning pipeline

## Support

- Documentation: `/docs/learning/`
- API Reference: `/api/docs#learning`
- Issues: GitHub Issues
- Slack: #agent-learning channel

---

**Last Updated:** 2024-11-28  
**Version:** 1.0.0  
**Status:** Production Ready ✅
