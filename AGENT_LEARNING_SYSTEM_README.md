# 🎓 AI AGENT LEARNING SYSTEM

**Transform your AI agents from static tools into continuously evolving, self-improving intelligent systems.**

---

## 📚 Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[Quick Start Guide](./docs/AGENT_LEARNING_QUICK_START.md)** | Get started in 5 minutes | Developers |
| **[Complete System Guide](./AGENT_LEARNING_SYSTEM_COMPLETE.md)** | Comprehensive documentation | Technical leads |
| **[Implementation Status](./AGENT_LEARNING_IMPLEMENTATION_STATUS.md)** | What's built and what's next | Product managers |
| **[API Reference](#api-reference)** | Endpoint documentation | Backend developers |
| **[Frontend Guide](#frontend-integration)** | Component usage | Frontend developers |

---

## 🎯 What is the Learning System?

The Agent Learning System enables your AI agents to:

- ✅ **Learn from user feedback** - Thumbs up/down, ratings, corrections
- ✅ **Improve from expert guidance** - Annotation and quality assessment
- ✅ **Optimize automatically** - Prompt tuning, RAG enhancement, behavior cloning
- ✅ **Test improvements safely** - A/B experiments with rollback capability
- ✅ **Track progress** - Metrics and analytics on agent improvement

---

## 🚀 5-Minute Setup

### 1. Database Setup
```bash
# Already applied! Migration: 20251128000000_agent_learning_system.sql
psql $DATABASE_URL -c "\dt learning_*"
```

### 2. Add Feedback Collection
```typescript
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={execution.output}
/>
```

### 3. Access Expert Interface
```
Navigate to: /admin/learning/annotation
```

### 4. Monitor Learning
```typescript
import { useLearningStats } from '@/hooks/useLearning';

const { data } = useLearningStats();
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│      DATA COLLECTION LAYER          │
│  User Feedback | Expert Annotations │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     LEARNING ENGINES LAYER          │
│  Prompt | RAG | Behavior | Fine-Tune│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      EVALUATION LAYER               │
│  A/B Tests | Safety | Human Review  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      DEPLOYMENT LAYER               │
│  Canary | Gradual | Rollback        │
└─────────────────────────────────────┘
```

---

## 📊 Features

### Feedback Collection
- 👍 One-click thumbs up/down
- ⭐ Multi-dimensional ratings (accuracy, helpfulness, clarity, completeness)
- ✏️ Inline correction editor
- 🏷️ Issue categorization
- 💬 Free-text comments

### Expert Annotation
- 📋 Queue-based review
- 🎚️ Quality assessment sliders
- ✅ Approve/reject workflow
- 📝 Improvement suggestions
- 📊 Progress tracking

### Learning Engines
- 🤖 **Prompt Optimization** - Automated prompt improvement
- 🔍 **RAG Training** - Retrieval quality enhancement
- 👨‍🏫 **Behavior Learning** - Learn from experts
- 🧠 **Fine-Tuning** - Model weight adjustments
- 🎯 **RL** - Reinforcement learning

### A/B Testing
- 🧪 Safe experimentation
- 📊 Statistical validation
- 🚦 Traffic splitting
- ↩️ Quick rollback

---

## 🛠️ API Reference

### Submit Feedback
```http
POST /api/learning/feedback
Content-Type: application/json

{
  "execution_id": "uuid",
  "agent_id": "uuid",
  "feedback_type": "thumbs_up",
  "rating": 5
}
```

### Get Annotation Queue
```http
GET /api/learning/annotation-queue?status=pending&limit=50
```

### Submit Annotation
```http
POST /api/learning/annotations
Content-Type: application/json

{
  "learning_example_id": "uuid",
  "technical_accuracy": 0.95,
  "notes": "Excellent response"
}
```

### Create Training Run
```http
POST /api/learning/training-runs
Content-Type: application/json

{
  "agent_id": "uuid",
  "dataset_id": "uuid",
  "training_type": "prompt_optimization",
  "config": {...}
}
```

### Create Experiment
```http
POST /api/learning/experiments
Content-Type: application/json

{
  "agent_id": "uuid",
  "name": "Improved Prompts",
  "control_config": {...},
  "treatment_config": {...}
}
```

---

## 🎨 Frontend Integration

### Feedback Collector Component
```typescript
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={execution.output}
  onFeedbackSubmitted={() => {
    toast.success('Thank you for your feedback!');
    refetchData();
  }}
/>
```

### React Hooks
```typescript
import {
  useSubmitFeedback,
  useAnnotationQueue,
  useSubmitAnnotation,
  useLearningStats,
  useTrainingRuns,
  useExperiments,
} from '@/hooks/useLearning';

// Submit feedback
const submitFeedback = useSubmitFeedback();
await submitFeedback.mutateAsync({...});

// Get annotation queue
const { data: queue } = useAnnotationQueue({ status: 'pending' });

// Get stats
const { data: stats } = useLearningStats();
```

---

## 📈 Success Metrics

### Week 1
- ✅ Feedback on 20% of executions
- ✅ 100+ examples collected
- ✅ First prompt optimization

### Month 1
- ✅ 500+ examples
- ✅ 100+ expert annotations
- ✅ 3+ training runs
- ✅ First A/B experiment

### Quarter 1
- ✅ +15% user satisfaction
- ✅ -20% correction rate
- ✅ +10% agent accuracy
- ✅ 5+ successful experiments

---

## 🔗 Related Documentation

- [Agent Platform Guide](./AGENT_PLATFORM_GUIDE.md)
- [RAG System](./RAG_SYSTEM_COMPLETE.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Security Guidelines](./SECURITY.md)

---

## 👥 Support

- **Technical Issues:** File a GitHub issue
- **Questions:** #ai-learning Slack channel
- **Expert Training:** Contact AI/ML team

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-11-28 | Initial release - Full system implementation |

---

**Status:** ✅ PRODUCTION READY  
**Maintained by:** AI/ML Team  
**License:** Proprietary
