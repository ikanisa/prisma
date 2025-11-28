# Agent Learning System - Integration Guide

## Quick Integration Checklist

### Step 1: Database Setup ✓

```bash
# Apply the learning system migration
psql $DATABASE_URL -f migrations/sql/20251128000000_agent_learning_system.sql

# Verify tables created
psql $DATABASE_URL -c "\dt learning_* agent_feedback expert_annotations training_* embedding_training_pairs"
```

### Step 2: Backend Integration

#### 2.1 Update `server/main.py`

```python
# Add learning router
from server.api.learning import router as learning_router

# Include in app
app.include_router(learning_router)
```

#### 2.2 Add LLM Client Dependency (if not exists)

```python
# server/dependencies.py
from typing import Optional

class LLMClient:
    """Mock LLM client - replace with actual OpenAI client"""
    
    async def generate(self, prompt: str, **kwargs):
        # Replace with actual OpenAI call
        return {"text": "Generated response"}

def get_llm_client() -> Optional[LLMClient]:
    """Dependency for LLM client"""
    return LLMClient()
```

Update `server/api/learning.py`:
```python
from server.dependencies import get_llm_client

# Update endpoints that need LLM
@router.post("/optimize-prompt")
async def optimize_prompt(
    request: PromptOptimizationRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    llm_client=Depends(get_llm_client)  # Use actual dependency
):
    # ...
```

### Step 3: Frontend Integration

#### 3.1 Add Feedback Collector to Agent Outputs

```typescript
// src/components/agents/AgentOutput.tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

export function AgentOutput({ execution }: { execution: AgentExecution }) {
  return (
    <div>
      {/* Agent output rendering */}
      <div className="agent-response">
        {execution.output}
      </div>
      
      {/* Feedback collector */}
      <FeedbackCollector
        executionId={execution.id}
        agentId={execution.agent_id}
        agentOutput={execution.output}
        onFeedbackSubmitted={() => {
          // Optional: trigger analytics
          console.log('Feedback submitted');
        }}
      />
    </div>
  );
}
```

#### 3.2 Create FeedbackCollector Component

Create `src/components/learning/FeedbackCollector.tsx` using the specification from the document.

#### 3.3 Add Learning Dashboard Route

```typescript
// src/App.tsx or router config
import { AnnotationPage } from '@/pages/admin/learning/annotation';

// Add route
{
  path: '/admin/learning/annotation',
  element: <AnnotationPage />,
  meta: { requiresAuth: true, role: 'expert' }
}
```

### Step 4: Environment Variables

Add to `.env`:

```bash
# Learning System Configuration
LEARNING_ENABLED=true
LEARNING_AUTO_CREATE_EXAMPLES=true
LEARNING_MIN_QUALITY_SCORE=0.7
LEARNING_FEEDBACK_RATE_LIMIT=10  # per minute per user

# Prompt Optimization
PROMPT_OPTIMIZATION_ENABLED=true
PROMPT_OPTIMIZATION_INTERVAL=weekly

# RAG Training
RAG_TRAINING_ENABLED=true
RAG_TRAINING_MIN_SAMPLES=1000
RAG_EMBEDDING_MODEL=text-embedding-ada-002

# A/B Testing
AB_TEST_MIN_SAMPLE_SIZE=1000
AB_TEST_MIN_DURATION_HOURS=168  # 1 week
AB_TEST_SIGNIFICANCE_LEVEL=0.05
```

### Step 5: Background Jobs (Optional but Recommended)

#### 5.1 Create Periodic Tasks

```python
# server/tasks/learning.py
from celery import shared_task
from server.db import get_db_session
from server.learning import PromptOptimizer, RAGTrainer

@shared_task
def optimize_agent_prompts():
    """Run weekly prompt optimization for all agents"""
    with get_db_session() as db:
        # Get active agents
        agents = db.fetch("SELECT id FROM agents WHERE is_active = true")
        
        for agent in agents:
            optimizer = PromptOptimizer(agent['id'], db, llm_client)
            # Run optimization...

@shared_task
def train_rag_embeddings():
    """Train RAG embeddings when enough data collected"""
    with get_db_session() as db:
        trainer = RAGTrainer(embedder, vector_store, db)
        # Check if training needed
        # Run training...

@shared_task
def analyze_ab_tests():
    """Analyze completed A/B tests"""
    with get_db_session() as db:
        # Fetch completed tests
        # Calculate statistical significance
        # Update winners
```

#### 5.2 Schedule Tasks

```python
# server/celery_config.py
from celery.schedules import crontab

CELERYBEAT_SCHEDULE = {
    'optimize-prompts-weekly': {
        'task': 'server.tasks.learning.optimize_agent_prompts',
        'schedule': crontab(day_of_week=1, hour=2, minute=0),  # Monday 2 AM
    },
    'train-rag-daily': {
        'task': 'server.tasks.learning.train_rag_embeddings',
        'schedule': crontab(hour=3, minute=0),  # Daily 3 AM
    },
    'analyze-tests-hourly': {
        'task': 'server.tasks.learning.analyze_ab_tests',
        'schedule': crontab(minute=0),  # Every hour
    },
}
```

### Step 6: Testing

#### 6.1 Test Feedback Submission

```python
# tests/test_learning.py
import pytest
from server.learning import FeedbackCollector

@pytest.mark.asyncio
async def test_submit_feedback(db_session, test_user):
    collector = FeedbackCollector(db_session)
    
    feedback_id = await collector.submit_feedback(
        execution_id="test-exec-id",
        agent_id="test-agent-id",
        user_id=test_user['id'],
        feedback_type="thumbs_up",
        rating=5
    )
    
    assert feedback_id is not None

@pytest.mark.asyncio
async def test_create_learning_example_from_correction(db_session, test_user):
    collector = FeedbackCollector(db_session)
    
    # Submit correction
    feedback_id = await collector.submit_feedback(
        execution_id="test-exec-id",
        agent_id="test-agent-id",
        user_id=test_user['id'],
        feedback_type="correction",
        correction_text="The correct answer is..."
    )
    
    # Verify learning example created
    examples = await db_session.fetch(
        "SELECT * FROM learning_examples WHERE source_execution_id = $1",
        "test-exec-id"
    )
    
    assert len(examples) == 1
    assert examples[0]['example_type'] == 'correction'
```

#### 6.2 Test Prompt Optimization

```python
@pytest.mark.asyncio
async def test_prompt_optimization(db_session, mock_llm):
    optimizer = PromptOptimizer("test-agent-id", db_session, mock_llm)
    
    result = await optimizer.optimize(
        current_prompt="You are a helpful assistant",
        learning_examples=[],
        optimization_goals=["clarity"]
    )
    
    assert result.best_variant is not None
    assert result.improvement_percentage >= 0
```

### Step 7: Monitoring

#### 7.1 Add Metrics Collection

```python
# server/telemetry.py
from prometheus_client import Counter, Histogram

learning_feedback_total = Counter(
    'learning_feedback_total',
    'Total feedback submissions',
    ['agent_id', 'feedback_type']
)

learning_annotation_duration = Histogram(
    'learning_annotation_duration_seconds',
    'Time spent on annotations',
    ['expert_id']
)

learning_prompt_optimization_improvement = Histogram(
    'learning_prompt_optimization_improvement_percent',
    'Prompt optimization improvement percentage',
    ['agent_id']
)
```

#### 7.2 Create Grafana Dashboard

```yaml
# Example Grafana dashboard config
dashboard:
  title: "Agent Learning System"
  panels:
    - title: "Feedback Rate"
      query: "rate(learning_feedback_total[5m])"
    - title: "Average Quality Score"
      query: "avg(learning_example_quality_score)"
    - title: "Pending Annotations"
      query: "learning_examples_pending_count"
```

### Step 8: User Documentation

Create user-facing guides:

#### 8.1 For End Users
- How to provide feedback
- Understanding thumbs up/down
- Providing corrections
- What happens with feedback

#### 8.2 For Expert Annotators
- Annotation guidelines
- Quality scoring criteria
- Best practices
- Review workflow

#### 8.3 For Administrators
- Managing learning datasets
- Running prompt optimizations
- Monitoring learning performance
- A/B test management

## Common Integration Patterns

### Pattern 1: Automatic Feedback Collection

```python
# In agent execution handler
async def execute_agent(agent_id: str, input_data: dict, user_id: str):
    # Execute agent
    result = await agent.execute(input_data)
    
    # Store execution
    execution_id = await store_execution(agent_id, input_data, result)
    
    # Return with feedback prompt
    return {
        "result": result,
        "execution_id": execution_id,
        "prompt_feedback": True  # Signal UI to show feedback collector
    }
```

### Pattern 2: Inline Correction

```python
# Allow users to edit and submit corrections inline
async def submit_inline_correction(
    execution_id: str,
    corrected_output: str,
    user_id: str
):
    collector = FeedbackCollector(db)
    
    # Get original execution
    execution = await get_execution(execution_id)
    
    # Submit as correction
    await collector.submit_feedback(
        execution_id=execution_id,
        agent_id=execution['agent_id'],
        user_id=user_id,
        feedback_type="correction",
        correction_text=corrected_output,
        rating=3  # Moderate rating since correction was needed
    )
```

### Pattern 3: Expert Review Workflow

```python
# Batch assign examples to experts
async def assign_annotation_batch(
    expert_id: str,
    domain: str,
    count: int = 20
):
    collector = FeedbackCollector(db)
    
    # Get examples
    queue = await collector.get_annotation_queue(
        filters={"domain": domain},
        limit=count
    )
    
    # Mark as assigned
    await db.execute(
        "UPDATE learning_examples SET review_status = 'in_review' WHERE id = ANY($1)",
        [e['id'] for e in queue]
    )
    
    return queue
```

## Troubleshooting

### Issue: Feedback not creating learning examples
**Solution**: Check that `source_execution_id` exists in `agent_executions` table.

### Issue: Prompt optimization failing
**Solution**: Ensure LLM client is properly configured and has API credits.

### Issue: RAG training not triggering
**Solution**: Verify minimum sample threshold is met (check `embedding_training_pairs` count).

### Issue: Annotations not appearing in queue
**Solution**: Check RLS policies and ensure user has proper permissions.

## Performance Optimization

1. **Index Coverage**: All foreign keys and common filters are indexed
2. **JSONB Indexing**: Consider GIN indexes for JSONB fields if querying nested data
3. **Partitioning**: For high-volume deployments, partition `agent_feedback` by `created_at`
4. **Archiving**: Archive old learning examples to cold storage after 6 months

## Security Best Practices

1. **Rate Limiting**: Implement per-user rate limits on feedback submission
2. **Input Validation**: Sanitize all text inputs for XSS
3. **Access Control**: Enforce expert role for annotations
4. **Audit Logging**: Log all annotation decisions
5. **Data Privacy**: Anonymize PII in learning examples

---

**Implementation Status**: Core system ✅ | UI Components ⚠️ | Background Jobs ⚠️ | Monitoring ⚠️

**Next Priority**: Create `FeedbackCollector.tsx` component and integrate with agent execution flow.
