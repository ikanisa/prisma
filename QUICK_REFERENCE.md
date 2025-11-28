# 🚀 Agent Learning System - Quick Reference Card

## ⚡ 5-Minute Quick Start

### 1. Database
```bash
psql $DATABASE_URL -f migrations/sql/20251128000000_agent_learning_system.sql
```

### 2. Verify Integration
```bash
# Check that router is included in main.py
grep "learning_router" server/main.py
# Should output:
# from .api.learning import router as learning_router
# app.include_router(learning_router)
```

### 3. Restart Server
```bash
# Kill existing server (Ctrl+C)
# Start server
uvicorn server.main:app --reload --port 8000
```

### 4. Add to UI
```typescript
import { FeedbackCollector } from '@/components/learning';

<FeedbackCollector
  executionId={execution.id}
  agentId={execution.agent_id}
  agentOutput={execution.output}
/>
```

## 📁 File Locations

```
Backend:
├── server/learning/          (4 Python modules)
├── server/api/learning.py    (API endpoints)
└── server/main.py            (UPDATED - router added)

Frontend:
├── src/hooks/useLearning.ts
└── src/components/learning/
    ├── FeedbackCollector.tsx
    ├── AgentOutputCard.tsx
    ├── LearningDashboard.tsx
    └── index.ts

Database:
└── migrations/sql/20251128000000_agent_learning_system.sql

Docs:
├── DEPLOYMENT_GUIDE.md
├── IMPLEMENTATION_STATUS_FINAL.md
└── docs/learning/README.md
```

## 🔌 API Endpoints

```
POST   /api/learning/feedback
GET    /api/learning/feedback/stats/{agent_id}
GET    /api/learning/feedback/issues/{agent_id}
GET    /api/learning/annotations/queue
POST   /api/learning/annotations
GET    /api/learning/stats
POST   /api/learning/demonstrations
POST   /api/learning/optimize-prompt
GET    /api/learning/datasets/{agent_id}
```

## 💡 Common Commands

```bash
# Check if tables exist
psql $DATABASE_URL -c "\dt learning_*"

# View recent feedback
psql $DATABASE_URL -c "SELECT * FROM agent_feedback ORDER BY created_at DESC LIMIT 5;"

# View learning examples
psql $DATABASE_URL -c "SELECT * FROM learning_examples WHERE review_status = 'pending' LIMIT 5;"

# Count pending annotations
psql $DATABASE_URL -c "SELECT COUNT(*) FROM learning_examples WHERE review_status = 'pending';"
```

## 🧪 Test Endpoints

```bash
# Test stats endpoint (requires auth)
curl http://localhost:8000/api/learning/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test feedback submission (requires auth)
curl -X POST http://localhost:8000/api/learning/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "execution_id": "test-123",
    "agent_id": "agent-456",
    "feedback_type": "thumbs_up",
    "rating": 5
  }'
```

## 🎨 UI Components Usage

### FeedbackCollector (Minimal)
```typescript
<FeedbackCollector
  executionId={execution.id}
  agentId={execution.agent_id}
  agentOutput={execution.output}
/>
```

### AgentOutputCard (Full)
```typescript
<AgentOutputCard execution={execution} />
```

### LearningDashboard
```typescript
<LearningDashboard agentId="agent-123" />
```

## 📊 React Hooks

```typescript
import {
  useSubmitFeedback,
  useFeedbackStats,
  useCommonIssues,
  useAnnotationQueue,
  useSubmitAnnotation,
  useLearningStats,
  useOptimizePrompt,
  useTrainingDatasets,
  useSubmitDemonstration
} from '@/hooks/useLearning';

// Example
const submitFeedback = useSubmitFeedback();
await submitFeedback.mutateAsync({ ... });
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Endpoints 404 | Check `server/main.py` has `app.include_router(learning_router)` |
| Table not found | Run migration: `psql $DATABASE_URL -f migrations/...` |
| Import errors | Ensure `server/learning/` and `server/api/learning.py` exist |
| UI component errors | Check `src/components/learning/` exists |
| TypeScript errors | Run `pnpm install` to ensure deps are installed |

## 📈 Success Metrics

Track these in your analytics:

- Feedback collection rate: Target > 20%
- Average rating: Target > 4.0/5.0
- Corrections submitted: Track trend
- Pending annotations: Keep < 50
- Quality scores: Track improvements

## 🔐 Security Checklist

- [x] RLS policies applied
- [ ] Rate limiting added
- [ ] CSRF protection enabled
- [ ] Audit logging configured
- [ ] PII anonymization implemented

## 📚 Documentation

- **Quick Start**: `/AGENT_LEARNING_QUICK_START.md`
- **Deployment**: `/DEPLOYMENT_GUIDE.md`
- **Status**: `/IMPLEMENTATION_STATUS_FINAL.md`
- **Implementation**: `/docs/AGENT_LEARNING_SYSTEM_IMPLEMENTATION.md`
- **Integration**: `/docs/AGENT_LEARNING_INTEGRATION_GUIDE.md`

## ✅ Verification Checklist

- [ ] Migration applied
- [ ] Tables exist in DB
- [ ] Server starts without errors
- [ ] Endpoints respond
- [ ] UI components render
- [ ] Feedback submission works
- [ ] Dashboard displays data

---

**Status**: ✅ Ready for Deployment
**Version**: 1.0.0
**Last Updated**: 2025-11-28
