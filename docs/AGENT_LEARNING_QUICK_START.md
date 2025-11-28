# Agent Learning System - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Verify Database Migration

```bash
# Check if learning tables exist
psql $DATABASE_URL -c "\dt learning_*"
```

Expected output:
```
 learning_examples
 learning_experiments
```

### 2. Enable Feedback Collection

Add to any agent execution view:

```typescript
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={execution.output}
  onFeedbackSubmitted={() => toast.success('Feedback submitted!')}
/>
```

### 3. Access Expert Annotation

Navigate to: `/admin/learning/annotation`

- Filter by domain/agent
- Rate quality (accuracy, clarity, etc.)
- Approve or reject examples
- Add improvement suggestions

### 4. Monitor Learning Stats

```typescript
import { useLearningStats } from '@/hooks/useLearning';

const { data: stats } = useLearningStats();

console.log(`Pending annotations: ${stats.pendingAnnotations}`);
console.log(`Annotated today: ${stats.annotatedToday}`);
```

### 5. Start First Training Run

```typescript
import { useStartTraining } from '@/hooks/useLearning';

const startTraining = useStartTraining();

await startTraining.mutateAsync({
  agentId: 'your-agent-id',
  datasetId: 'your-dataset-id',
  trainingType: 'prompt_optimization',
  config: {
    optimization_goals: ['accuracy', 'clarity'],
    num_variants: 4,
  },
});
```

## 📋 Quick Reference

### Feedback Types
- `thumbs_up` - Quick positive feedback
- `thumbs_down` - Quick negative feedback
- `star_rating` - 1-5 star rating
- `detailed_feedback` - Text feedback
- `correction` - Corrected output
- `report_issue` - Report problem

### Example Types
- `positive` - Good example to learn from
- `negative` - Bad example to avoid
- `correction` - User-corrected output
- `demonstration` - Expert demonstration
- `edge_case` - Unusual scenario
- `failure` - System failure case
- `preference` - A vs B preference

### Training Types
- `prompt_optimization` - Optimize system prompts
- `rag_tuning` - Improve RAG retrieval
- `fine_tuning` - Fine-tune model weights
- `rlhf` - Reinforcement learning from human feedback
- `dpo` - Direct preference optimization

### Review Status
- `pending` - Awaiting review
- `in_review` - Currently being reviewed
- `approved` - Approved for training
- `rejected` - Not suitable
- `needs_revision` - Needs changes

## 🔗 Full Documentation

See [AGENT_LEARNING_SYSTEM_COMPLETE.md](./AGENT_LEARNING_SYSTEM_COMPLETE.md) for comprehensive guide.
