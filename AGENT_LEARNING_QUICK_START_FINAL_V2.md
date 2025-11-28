# 🚀 AGENT LEARNING SYSTEM - QUICK START GUIDE
**Get the learning system running in < 30 minutes**

---

## ⚡ TL;DR

```bash
# 1. Apply migrations
psql "$DATABASE_URL" -f supabase/migrations/20260128100000_agent_learning_system_comprehensive.sql

# 2. Set environment variables
export LEARNING_ENABLED=true
export LEARNING_AUTO_OPTIMIZE=true

# 3. Start backend
uvicorn server.main:app --reload --port 8000

# 4. Start frontend
pnpm dev

# 5. Navigate to any agent execution page - feedback collector will appear
# 6. Navigate to /admin/learning/annotation for annotation interface
```

**Done! Learning system is now active.**

---

## 📋 30-MINUTE SETUP

### Step 1: Database Setup (5 min)

```bash
# Connect to your PostgreSQL database
export DATABASE_URL="postgresql://user:pass@localhost:5432/prisma_glow"

# Apply the learning system migration
psql "$DATABASE_URL" -f supabase/migrations/20260128100000_agent_learning_system_comprehensive.sql

# Verify tables were created
psql "$DATABASE_URL" -c "\dt *learning*"
```

**Expected output:**
```
 learning_examples
 agent_feedback  
 expert_annotations
 training_datasets
 dataset_examples
 training_runs
 learning_experiments
```

---

### Step 2: Environment Configuration (2 min)

Add to `.env.local`:

```bash
# Learning System
LEARNING_ENABLED=true
LEARNING_AUTO_OPTIMIZE=true
LEARNING_MIN_FEEDBACK_COUNT=10
LEARNING_OPTIMIZATION_SCHEDULE="0 2 * * *"

# OpenAI (already configured)
OPENAI_API_KEY=sk-...

# Database (already configured)
DATABASE_URL=postgresql://...
```

---

### Step 3: Backend Verification (3 min)

```bash
# Ensure Python environment is active
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies (if not already)
pip install -r server/requirements.txt

# Start FastAPI
uvicorn server.main:app --reload --port 8000

# In another terminal, verify endpoints
curl http://localhost:8000/api/learning/stats
```

**Expected response:**
```json
{
  "pendingAnnotations": 0,
  "annotatedToday": 0,
  "totalExamples": 0,
  "activeDatasets": 0
}
```

---

### Step 4: Frontend Verification (5 min)

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Start dev server
pnpm dev

# Open browser
open http://localhost:5173
```

**Verify components load:**
1. Navigate to any agent execution page
2. Look for feedback collector below output (thumbs up/down buttons)
3. Navigate to `/admin/learning/annotation` (requires admin role)
4. Navigate to `/admin/learning/training`

---

### Step 5: Test Feedback Flow (5 min)

**Execute an agent:**
```typescript
// In your agent execution page
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

// Add below agent output
<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={result.output}
  onFeedbackSubmitted={() => {
    console.log('Feedback submitted!');
  }}
/>
```

**Test it:**
1. Run an agent task
2. Click "👍 Yes" or "👎 No" below the output
3. If you clicked "No", detailed dialog opens
4. Fill out feedback form
5. Submit
6. Check database:

```sql
SELECT * FROM agent_feedback ORDER BY created_at DESC LIMIT 5;
SELECT * FROM learning_examples ORDER BY created_at DESC LIMIT 5;
```

---

### Step 6: Test Annotation Interface (5 min)

1. Navigate to `/admin/learning/annotation`
2. If queue is empty, create a test example:

```sql
INSERT INTO learning_examples (
  agent_id, 
  example_type, 
  input_text, 
  input_context, 
  expected_output,
  source_type,
  review_status,
  domain,
  task_type
) VALUES (
  (SELECT id FROM agents LIMIT 1),
  'correction',
  'Calculate Q4 revenue',
  '{"context": "test"}',
  'Q4 revenue is $1.5M',
  'user_feedback',
  'pending',
  'accounting',
  'calculation'
);
```

3. Refresh annotation page - example should appear
4. Review, rate quality dimensions, and approve/reject
5. Check database:

```sql
SELECT * FROM expert_annotations ORDER BY created_at DESC LIMIT 1;
```

---

### Step 7: Test Prompt Optimization (5 min)

**Manually trigger optimization:**

```bash
curl -X POST http://localhost:8000/api/learning/optimize-prompt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agent_id": "your-agent-id",
    "current_prompt": "You are a helpful accounting assistant...",
    "optimization_goals": ["accuracy", "clarity"]
  }'
```

**Expected response:**
```json
{
  "best_variant": {
    "id": "clarified",
    "system_prompt": "Optimized prompt...",
    "metadata": {"strategy": "clarification"},
    "performance_metrics": {
      "overall_score": 0.85
    }
  },
  "improvement_percentage": 8.5,
  "recommendations": [
    "Use clarification strategy",
    "Continue collecting feedback"
  ]
}
```

---

## 🎯 INTEGRATION CHECKLIST

### Frontend Integration

**Option 1: Add to existing agent execution page**

```tsx
// src/pages/agents/[id]/execute.tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

export default function AgentExecutionPage() {
  const { execution } = useAgentExecution();
  
  return (
    <div>
      {/* Existing agent output */}
      <AgentOutputCard output={execution.output} />
      
      {/* Add feedback collector */}
      <FeedbackCollector
        executionId={execution.id}
        agentId={execution.agent_id}
        agentOutput={execution.output}
        onFeedbackSubmitted={() => {
          toast.success('Thank you for helping improve this agent!');
        }}
      />
    </div>
  );
}
```

**Option 2: Add to agent result component**

```tsx
// src/components/agents/AgentResultCard.tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

export function AgentResultCard({ result, agentId, executionId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent>
        {result}
      </CardContent>
      <CardFooter>
        <FeedbackCollector
          executionId={executionId}
          agentId={agentId}
          agentOutput={result}
        />
      </CardFooter>
    </Card>
  );
}
```

---

### Backend Integration

**Add to agent execution endpoint:**

```python
# server/api/agents.py
from server.learning.feedback_collector import FeedbackCollector

@router.post("/agents/{agent_id}/execute")
async def execute_agent(
    agent_id: str,
    request: AgentExecutionRequest,
    db = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Execute agent
    result = await agent.execute(request.input)
    
    # Store execution
    execution_id = await db.fetchval("""
        INSERT INTO agent_executions (
            agent_id, user_id, input, output, status
        ) VALUES ($1, $2, $3, $4, 'completed')
        RETURNING id
    """, agent_id, current_user.id, request.input, result.output)
    
    # Return with execution_id for feedback
    return {
        "execution_id": execution_id,
        "agent_id": agent_id,
        "output": result.output,
        "metadata": result.metadata
    }
```

---

## 🔄 BACKGROUND JOBS SETUP

### Option A: Simple Scheduler (APScheduler)

```python
# server/learning_scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from server.learning.prompt_optimizer import PromptOptimizer
from server.learning.rag_trainer import RAGTrainer

scheduler = BackgroundScheduler()

# Daily prompt optimization at 2 AM
@scheduler.scheduled_job('cron', hour=2)
async def optimize_prompts():
    agents = await get_agents_needing_optimization()
    for agent in agents:
        optimizer = PromptOptimizer(agent.id, db, llm)
        result = await optimizer.optimize(
            agent.system_prompt,
            await get_learning_examples(agent.id),
            ['accuracy', 'clarity']
        )
        await save_optimization_result(agent.id, result)

# RAG updates every 6 hours
@scheduler.scheduled_job('interval', hours=6)
async def update_rag_embeddings():
    trainer = RAGTrainer(embedding_model, vector_store, db)
    feedback_batch = await get_retrieval_feedback()
    results = await trainer.train_from_feedback(feedback_batch)
    await log_training_results(results)

scheduler.start()
```

**Start scheduler:**
```python
# server/main.py
from server.learning_scheduler import scheduler

@app.on_event("startup")
async def startup_event():
    scheduler.start()
    
@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
```

---

### Option B: Celery (Production)

```python
# server/celery_app.py
from celery import Celery

celery_app = Celery(
    'learning',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery_app.conf.beat_schedule = {
    'optimize-prompts-daily': {
        'task': 'server.learning_jobs.optimize_prompts_task',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
    'update-rag-embeddings': {
        'task': 'server.learning_jobs.update_rag_task',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
}

# server/learning_jobs.py
from server.celery_app import celery_app

@celery_app.task
def optimize_prompts_task():
    # ... implementation
    pass

@celery_app.task
def update_rag_task():
    # ... implementation
    pass
```

**Start workers:**
```bash
# Terminal 1: Start Celery worker
celery -A server.celery_app worker --loglevel=info

# Terminal 2: Start Celery beat (scheduler)
celery -A server.celery_app beat --loglevel=info
```

---

## 📊 MONITORING

### Add Logging

```python
# server/learning/prompt_optimizer.py
import logging

logger = logging.getLogger(__name__)

async def optimize(self, ...):
    logger.info(f"Starting prompt optimization for agent {self.agent_id}")
    
    try:
        result = await self._run_optimization()
        logger.info(f"Optimization complete: {result.improvement_percentage}% improvement")
        return result
    except Exception as e:
        logger.error(f"Optimization failed: {str(e)}", exc_info=True)
        raise
```

---

### Add Metrics

```python
# server/metrics.py
from prometheus_client import Counter, Histogram

feedback_submissions = Counter(
    'agent_feedback_submissions_total',
    'Total feedback submissions',
    ['agent_id', 'feedback_type']
)

optimization_duration = Histogram(
    'prompt_optimization_duration_seconds',
    'Time spent optimizing prompts',
    ['agent_id']
)

# Usage
feedback_submissions.labels(agent_id=agent_id, feedback_type='thumbs_up').inc()

with optimization_duration.labels(agent_id=agent_id).time():
    result = await optimizer.optimize(...)
```

---

## 🧪 TESTING

### Test Feedback Submission

```python
# tests/test_learning_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_submit_feedback(client: AsyncClient, test_execution):
    response = await client.post(
        "/api/learning/feedback",
        json={
            "execution_id": test_execution.id,
            "agent_id": test_execution.agent_id,
            "feedback_type": "thumbs_up",
            "rating": 5
        }
    )
    
    assert response.status_code == 201
    assert response.json()["status"] == "success"
    
    # Verify in database
    feedback = await db.fetchrow(
        "SELECT * FROM agent_feedback WHERE execution_id = $1",
        test_execution.id
    )
    assert feedback is not None
    assert feedback['rating'] == 5
```

---

### Test Prompt Optimization

```python
@pytest.mark.asyncio
async def test_prompt_optimization(db, llm_client, test_agent):
    optimizer = PromptOptimizer(test_agent.id, db, llm_client)
    
    # Create test examples
    examples = await create_test_learning_examples(test_agent.id, count=20)
    
    # Run optimization
    result = await optimizer.optimize(
        current_prompt=test_agent.system_prompt,
        learning_examples=examples,
        optimization_goals=['accuracy', 'clarity']
    )
    
    # Verify result
    assert result.best_variant is not None
    assert result.improvement_percentage >= 0
    assert len(result.recommendations) > 0
```

---

## 🎓 USER TRAINING

### For End Users

**Show this on first agent use:**

```tsx
// Onboarding tooltip
<Tooltip>
  <TooltipTrigger>
    <ThumbsUp />
  </TooltipTrigger>
  <TooltipContent>
    <p>Help improve this agent!</p>
    <p>Your feedback trains the AI to give better results.</p>
  </TooltipContent>
</Tooltip>
```

**Gamification:**
```sql
CREATE TABLE user_learning_points (
  user_id UUID REFERENCES users(id),
  points INTEGER DEFAULT 0,
  feedback_count INTEGER DEFAULT 0,
  annotation_count INTEGER DEFAULT 0
);

-- Award points for feedback
CREATE FUNCTION award_feedback_points() RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_learning_points 
  SET points = points + 10, feedback_count = feedback_count + 1
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_points_trigger
AFTER INSERT ON agent_feedback
FOR EACH ROW EXECUTE FUNCTION award_feedback_points();
```

---

### For Annotators

**Guidelines document:**

```markdown
# Annotation Guidelines

## Quality Dimensions

### Technical Accuracy (0-100%)
- Are facts, figures, and calculations correct?
- Are references and citations valid?
- Is the methodology sound?

### Professional Quality (0-100%)
- Does it meet professional standards?
- Is the tone appropriate?
- Is it well-structured?

### Completeness (0-100%)
- Are all aspects of the question addressed?
- Is enough detail provided?
- Are edge cases considered?

### Clarity (0-100%)
- Is it easy to understand?
- Is language clear and concise?
- Is structure logical?

## Best Practices

1. **Be Consistent**: Use the same standards across examples
2. **Be Specific**: Add notes explaining your ratings
3. **Focus on Learning**: What should the agent learn from this?
4. **Consider Context**: Domain, task type, user expertise level
```

---

## 🚨 TROUBLESHOOTING

### Issue: Feedback not appearing in database

**Check:**
```sql
-- Verify execution exists
SELECT * FROM agent_executions WHERE id = 'execution-id';

-- Check feedback table
SELECT * FROM agent_feedback WHERE execution_id = 'execution-id';

-- Check API logs
tail -f logs/fastapi.log | grep "learning/feedback"
```

---

### Issue: Optimization job failing

**Check:**
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test optimizer directly
from server.learning.prompt_optimizer import PromptOptimizer

optimizer = PromptOptimizer(agent_id, db, llm)
try:
    result = await optimizer.optimize(...)
    print(result)
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
```

---

### Issue: Annotation queue empty

**Check:**
```sql
-- Count pending examples
SELECT COUNT(*) FROM learning_examples WHERE review_status = 'pending';

-- Check filters
SELECT DISTINCT domain, task_type FROM learning_examples;

-- Lower quality threshold
SELECT * FROM learning_examples 
WHERE review_status = 'pending' 
  AND (quality_score IS NULL OR quality_score >= 0.5)
LIMIT 10;
```

---

## ✅ VERIFICATION CHECKLIST

After completing quick start, verify:

- [ ] Database tables created (8 tables)
- [ ] Backend API responding (`/api/learning/stats`)
- [ ] Frontend components rendering
- [ ] Feedback submission working
- [ ] Feedback appears in database
- [ ] Annotation interface loads
- [ ] Can approve/reject examples
- [ ] Prompt optimization endpoint works
- [ ] Background jobs configured (optional)
- [ ] Monitoring/logging working

---

## 📚 NEXT STEPS

1. **Integrate into your agents**: Add `FeedbackCollector` to agent execution pages
2. **Train annotators**: Run annotation workshop with experts
3. **Setup automation**: Configure background jobs for nightly optimization
4. **Monitor metrics**: Track feedback rate, annotation throughput, improvement
5. **Iterate**: Use insights to improve prompts, RAG, and workflows

---

## 🆘 SUPPORT

**Questions?**
- Check [full implementation status](/AGENT_LEARNING_SYSTEM_STATUS.md)
- Review [API documentation](http://localhost:8000/docs)
- Check logs: `tail -f logs/fastapi.log`
- Contact AI/ML team

---

**🎉 Congratulations!**  
Your agent learning system is now live and continuously improving your AI agents.
