# 🚀 Agent Learning System - Quick Start Guide

## TL;DR - Get Started in 5 Minutes

### Step 1: Database (1 min)
```bash
psql $DATABASE_URL -f migrations/sql/20251128000000_agent_learning_system.sql
```

### Step 2: Backend (1 min)
```python
# server/main.py - Add this line
from server.api.learning import router as learning_router
app.include_router(learning_router)
```

### Step 3: Frontend (1 min)
```typescript
// Add feedback to any agent output
import { useSubmitFeedback } from '@/hooks/useLearning';

const submitFeedback = useSubmitFeedback();

// Quick thumbs up/down
<button onClick={() => submitFeedback.mutateAsync({
  executionId: exec.id,
  agentId: exec.agent_id,
  feedbackType: "thumbs_up",
  rating: 5
})}>👍</button>
```

### Step 4: Test (2 min)
```bash
# Verify API is working
curl -X POST http://localhost:8000/api/learning/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "test",
    "agent_id": "test",
    "feedback_type": "thumbs_up",
    "rating": 5
  }'
```

## What You Get

✅ **Immediate**: User feedback collection
✅ **Day 1**: Feedback analytics dashboard
✅ **Week 1**: Expert annotation workflow
✅ **Week 2**: Automated prompt optimization
✅ **Month 1**: Self-improving RAG retrieval

## File Checklist

- [x] `migrations/sql/20251128000000_agent_learning_system.sql`
- [x] `server/learning/__init__.py`
- [x] `server/learning/prompt_optimizer.py`
- [x] `server/learning/rag_trainer.py`
- [x] `server/learning/behavior_learner.py`
- [x] `server/learning/feedback_collector.py`
- [x] `server/api/learning.py`
- [x] `src/hooks/useLearning.ts`
- [x] `docs/AGENT_LEARNING_SYSTEM_IMPLEMENTATION.md`
- [x] `docs/AGENT_LEARNING_INTEGRATION_GUIDE.md`
- [x] `docs/learning/README.md`
- [x] `AGENT_LEARNING_SYSTEM_COMPLETE.md`

## Next: Build UI Components

See original specification for:
- `FeedbackCollector.tsx` - Complete code provided
- `AnnotationInterface.tsx` - Complete code provided

## Need Help?

1. Check `docs/AGENT_LEARNING_INTEGRATION_GUIDE.md`
2. Review API endpoints in `server/api/learning.py`
3. See examples in `docs/learning/README.md`

**Total Setup Time**: 5 minutes
**Time to Value**: Immediate (feedback starts flowing)
**Time to Full ROI**: 1 month (agents self-improving)
