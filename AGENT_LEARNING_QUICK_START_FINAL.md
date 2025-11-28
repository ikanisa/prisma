# 🎓 AI Agent Learning System - Quick Start Guide

## Overview

The AI Agent Learning System enables your agents to learn and improve continuously from user feedback, expert demonstrations, and automated optimization. This guide gets you up and running in 15 minutes.

---

## ⚡ 5-Minute Setup

### 1. Apply Database Schema (2 minutes)

```bash
# Navigate to project root
cd /path/to/prisma

# Apply migration
psql "$DATABASE_URL" -f migrations/sql/20251128120000_agent_learning_system.sql

# Verify tables created
psql "$DATABASE_URL" -c "\dt *learning*"
```

Expected output:
```
learning_examples
agent_feedback
expert_annotations
training_datasets
dataset_examples
training_runs
learning_experiments
embedding_training_pairs
chunk_relevance_scores
```

### 2. Add Feedback to Your Agent UI (3 minutes)

```typescript
// In your agent output component (e.g., src/pages/agents/chat.tsx)
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

function AgentChatPage() {
  const [execution, setExecution] = useState(null);
  
  return (
    <div>
      {/* Your existing agent output */}
      <div className="agent-response">
        {execution?.output}
      </div>
      
      {/* Add feedback collector */}
      {execution && (
        <FeedbackCollector
          executionId={execution.id}
          agentId={execution.agent_id}
          agentOutput={execution.output}
          onFeedbackSubmitted={() => {
            toast.success('Thank you for your feedback!');
          }}
        />
      )}
    </div>
  );
}
```

### 3. Test Feedback Collection (1 minute)

1. Navigate to any agent conversation
2. Click thumbs up/down on an agent response
3. Verify feedback stored:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM agent_feedback;"
```

---

## 🎯 Core Workflows

### Workflow 1: Collecting User Feedback

```typescript
// Users see this after every agent response:

┌────────────────────────────────────────────┐
│ Agent Response: [The agent's output]       │
│                                             │
│ Was this helpful?                           │
│ [👍 Yes] [👎 No] [💬 Give detailed feedback] │
└────────────────────────────────────────────┘

// If thumbs down, prompt opens for:
// - Star ratings (1-5)
// - Issue categories
// - Free text feedback
// - Inline corrections
```

**Implementation:**
- Already included in `FeedbackCollector.tsx`
- No additional code needed
- Automatically creates learning examples from corrections

### Workflow 2: Expert Annotation

**Setup Expert User:**
```sql
-- Grant expert role
UPDATE users SET role = 'expert' WHERE email = 'expert@company.com';
```

**Access Annotation Interface:**
```
Navigate to: /admin/learning/annotation
```

**What Experts Do:**
1. Review pending learning examples
2. Rate quality on 4 dimensions (accuracy, professionalism, completeness, clarity)
3. Add notes and improvement suggestions
4. Approve or reject examples

### Workflow 3: Automated Prompt Optimization

**Run Via API:**
```bash
curl -X POST "https://your-api.com/api/learning/optimize-prompt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "agent_id": "your-agent-uuid",
    "current_prompt": "You are a helpful accounting assistant...",
    "optimization_goals": ["accuracy", "clarity"],
    "max_examples": 100
  }'
```

**Run Via Python:**
```python
from server.learning.prompt_optimizer import PromptOptimizer

optimizer = PromptOptimizer(agent_id, db_session, llm_client)

result = await optimizer.optimize(
    current_prompt="Your current prompt",
    learning_examples=examples,
    optimization_goals=['accuracy', 'helpfulness', 'clarity']
)

print(f"Improvement: {result.improvement_percentage}%")
print(f"New prompt:\n{result.best_variant.system_prompt}")
print(f"Recommendations: {result.recommendations}")
```

**Schedule Weekly:**
```python
# server/learning_scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', day_of_week='sun', hour=2)
async def weekly_optimization():
    agents = await db.fetch("SELECT id FROM agents WHERE learning_enabled = true")
    
    for agent in agents:
        optimizer = PromptOptimizer(agent['id'], db, llm)
        result = await optimizer.optimize(...)
        
        # Review and deploy if improvement > 5%
        if result.improvement_percentage > 5:
            await notify_admin(agent['id'], result)
```

---

## 📊 Monitoring & Analytics

### View Learning Stats

```bash
# Get system-wide stats
curl "https://your-api.com/api/learning/stats/overview" \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "pending_annotations": 42,
  "annotated_today": 15,
  "approved_examples": 287,
  "active_training_runs": 2,
  "avg_quality_score": 0.82
}
```

### View Agent-Specific Stats

```bash
# Get feedback stats for an agent
curl "https://your-api.com/api/learning/feedback/stats/AGENT_ID?days=30" \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "total_feedback": 156,
  "avg_rating": 4.2,
  "avg_accuracy": 4.1,
  "avg_helpfulness": 4.3,
  "avg_clarity": 4.0,
  "avg_completeness": 4.1,
  "satisfaction_rate": 0.84,
  "issue_breakdown": {
    "incorrect": 5,
    "incomplete": 8,
    "unclear": 3
  }
}
```

### Database Queries

```sql
-- Top performing agents
SELECT 
  agent_id,
  AVG(rating) as avg_rating,
  COUNT(*) as feedback_count
FROM agent_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY agent_id
ORDER BY avg_rating DESC;

-- Most common issues
SELECT 
  jsonb_array_elements_text(issue_categories) as issue,
  COUNT(*) as count
FROM agent_feedback
WHERE issue_categories IS NOT NULL
GROUP BY issue
ORDER BY count DESC;

-- Learning example quality over time
SELECT 
  DATE(created_at) as date,
  AVG(quality_score) as avg_quality,
  COUNT(*) as examples_created
FROM learning_examples
WHERE quality_score IS NOT NULL
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env
LEARNING_ENABLED=true
LEARNING_FEEDBACK_RATE_LIMIT=100
LEARNING_MIN_EXAMPLES=10
LEARNING_AUTO_OPTIMIZE=false  # Set true for automatic optimization
```

### System Config

```yaml
# config/system.yaml
learning:
  feedback:
    enabled: true
    require_rating: false
    enable_corrections: true
  
  optimization:
    schedule: "0 2 * * 0"  # Sunday 2 AM
    min_improvement: 5      # % threshold
    auto_deploy: false      # Require review
```

---

## ✅ Validation Checklist

After setup, verify these work:

- [ ] **Database**: All tables created
- [ ] **Feedback UI**: Visible on agent responses
- [ ] **Feedback API**: POST to `/api/learning/feedback` succeeds
- [ ] **Feedback Storage**: Data appears in `agent_feedback` table
- [ ] **Learning Examples**: Corrections create entries in `learning_examples`
- [ ] **Expert Access**: Expert users can access `/admin/learning/annotation`
- [ ] **Annotation**: Experts can approve/reject examples
- [ ] **Optimization API**: POST to `/api/learning/optimize-prompt` returns results
- [ ] **Stats API**: GET `/api/learning/stats/overview` returns data

---

## 🎯 Success Metrics

Track these KPIs weekly:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Feedback Rate | >10% | `SELECT COUNT(DISTINCT execution_id)::float / (SELECT COUNT(*) FROM agent_executions) FROM agent_feedback` |
| Avg Rating | >4.0 | `SELECT AVG(rating) FROM agent_feedback` |
| Correction Rate | >5% | `SELECT COUNT(*)::float / (SELECT COUNT(*) FROM agent_feedback) FROM agent_feedback WHERE correction_text IS NOT NULL` |
| Annotation Rate | <100 pending | `SELECT COUNT(*) FROM learning_examples WHERE review_status = 'pending'` |
| Avg Quality | >0.7 | `SELECT AVG(quality_score) FROM learning_examples WHERE quality_score IS NOT NULL` |

---

## 🚀 Next Steps

### Week 1: Foundation
- [x] Apply database schema
- [x] Add feedback UI to 1-2 agents
- [ ] Onboard 2-3 expert users
- [ ] Collect 50+ feedback responses

### Week 2: Annotation
- [ ] Experts annotate 100+ examples
- [ ] Achieve >70% approval rate
- [ ] Build dataset of 50+ approved examples

### Week 3: Optimization
- [ ] Run first prompt optimization
- [ ] Deploy if improvement >5%
- [ ] Monitor for regressions

### Week 4: Automation
- [ ] Schedule weekly optimization
- [ ] Set up monitoring dashboard
- [ ] Document learnings

---

## 💡 Pro Tips

1. **Start with One Agent**: Perfect the workflow before scaling
2. **Quality Over Quantity**: 10 high-quality examples > 100 low-quality
3. **Train Your Experts**: Ensure consistent quality standards
4. **Monitor Closely**: Watch first 2 weeks for issues
5. **Iterate Fast**: Weekly optimization cycles work best
6. **Document Everything**: Track what works and what doesn't

---

## 🆘 Troubleshooting

### Issue: No feedback appearing in database

```bash
# Check API is accessible
curl -X POST "https://your-api.com/api/learning/feedback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"execution_id":"test","agent_id":"test","feedback_type":"thumbs_up","rating":5}'

# Check database connection
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM agent_feedback;"
```

### Issue: Experts can't access annotation page

```sql
-- Verify expert role
SELECT id, email, role FROM users WHERE email = 'expert@company.com';

-- Grant if needed
UPDATE users SET role = 'expert' WHERE email = 'expert@company.com';
```

### Issue: Optimization not improving scores

- Collect more diverse examples (aim for 100+)
- Increase quality threshold (use only score >0.8)
- Try different optimization goals
- Review variant strategies

---

## 📚 Additional Resources

- [Full Implementation Guide](./AGENT_LEARNING_SYSTEM_IMPLEMENTATION.md)
- [Complete System Documentation](./AGENT_LEARNING_SYSTEM_COMPLETE.md)
- [API Reference](./AGENT_LEARNING_SYSTEM_README.md)
- [Architecture Details](./docs/learning/)

---

**Ready to start?** Apply the database migration and add the feedback UI. You'll be collecting learning data in under 15 minutes! 🚀
