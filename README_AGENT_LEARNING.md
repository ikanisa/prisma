# AI Agent Learning System - Quick Start

## What is the Learning System?

The Agent Learning System enables your AI agents to continuously improve through:
- **User Feedback**: Thumbs up/down, ratings, corrections
- **Expert Annotations**: Professional reviews and quality scoring
- **Automated Training**: Prompt optimization, RAG tuning, fine-tuning
- **A/B Testing**: Safe, data-driven deployments

## Quick Start (5 Minutes)

### 1. Add Feedback Collection

```tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

// In your agent output component
<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={response.text}
  onFeedbackSubmitted={() => {
    // Optional callback
  }}
/>
```

### 2. Review Feedback

Navigate to `/admin/learning/annotation` to review and approve examples.

### 3. Trigger Training

```tsx
import { useStartTraining } from '@/hooks/learning/useLearning';

const startTraining = useStartTraining();

await startTraining.mutateAsync({
  agentId: 'tax-agent',
  datasetId: 'approved-examples-v1',
  trainingType: 'prompt_optimization',
  config: {
    optimization_goals: ['accuracy', 'completeness']
  }
});
```

### 4. Run A/B Test

```tsx
import { useCreateExperiment } from '@/hooks/learning/useLearning';

const createExperiment = useCreateExperiment();

await createExperiment.mutateAsync({
  agentId: 'tax-agent',
  name: 'Improved Tax Prompt v2',
  description: 'Testing clarity improvements',
  hypothesis: 'New prompt increases user satisfaction by 15%',
  controlConfig: { system_prompt: currentPrompt },
  treatmentConfig: { system_prompt: optimizedPrompt },
});
```

## Architecture Overview

```
User Feedback → Data Collection → Learning Engines → Evaluation → Deployment
     ↓              ↓                  ↓                ↓            ↓
   Quick         Database         Prompt Opt.       A/B Test    Canary
  Ratings      Processing         RAG Tuning     Safety Check  Rollout
Corrections    Annotation         Fine-Tuning    Regression    Monitor
```

## Key Components

### Frontend
- `src/components/learning/FeedbackCollector.tsx` - User feedback UI
- `src/hooks/learning/useLearning.ts` - React Query hooks
- `src/pages/admin/learning/annotation.tsx` - Expert review (to be created)

### Backend
- `server/api/learning/__init__.py` - API routes
- `server/learning/prompt_optimizer.py` - Prompt optimization
- `server/learning/rag_trainer.py` - RAG improvement
- `server/learning/behavior_learner.py` - Behavioral learning
- `server/learning/feedback_collector.py` - Feedback processing

### Database
- `supabase/migrations/20260128100000_agent_learning_system_comprehensive.sql`

## Learning Types

| Type | Frequency | Oversight | Use Case |
|------|-----------|-----------|----------|
| **Prompt Learning** | Continuous | Review before deploy | Optimize instructions, examples |
| **RAG Learning** | Daily | Automated + spot checks | Improve retrieval, chunking |
| **Behavior Learning** | Weekly | Required approval | Learn from expert demos |
| **Fine-Tuning** | Monthly | Full review | Specialized model updates |
| **RL** | Experimental | Research team | Reward-based optimization |

## API Endpoints

### Feedback
- `POST /api/learning/feedback` - Submit user feedback
- `GET /api/learning/stats` - Get learning statistics

### Annotation
- `GET /api/learning/annotation/queue` - Get examples to review
- `POST /api/learning/annotation` - Submit expert annotation

### Training
- `GET /api/learning/training-runs` - List training jobs
- `POST /api/learning/training/start` - Start new training

### Experiments
- `GET /api/learning/experiments` - List A/B tests
- `POST /api/learning/experiments` - Create experiment
- `POST /api/learning/experiments/{id}/start` - Start experiment

## Best Practices

### ✅ DO
- Collect diverse examples across all capabilities
- Require expert review for deployments
- Use A/B testing for significant changes
- Monitor metrics closely during rollout
- Maintain golden test datasets
- Version datasets for reproducibility

### ❌ DON'T
- Deploy without evaluation
- Train on unreviewed feedback
- Skip safety validation
- Over-fit to recent examples
- Fine-tune too frequently
- Ignore user complaints

## Metrics to Track

**Quality**:
- User satisfaction rate (target: >80% ratings >= 4)
- Correction rate (target: <5%)
- Task completion rate (target: >90%)

**Performance**:
- Latency p95 (target: <2s)
- Error rate (target: <1%)
- Token efficiency (cost per task)

**Business**:
- User adoption rate
- Task automation rate
- Cost savings
- ROI

## Deployment Strategy

1. **Development** (0% traffic) - Train, test, review
2. **Canary** (5% traffic) - Monitor closely, quick rollback
3. **Gradual Rollout** (5→25→50→100%) - Incremental increase
4. **Full Deployment** (100%) - Continue monitoring

**Automatic Rollback Triggers**:
- User satisfaction drops >10%
- Error rate increases >20%
- Latency increases >50%
- Safety violations detected

## Examples

### Example 1: Collect Simple Feedback
```tsx
// User clicks thumbs up/down
<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={response.text}
/>
```

### Example 2: Expert Provides Correction
```tsx
// Expert edits output and provides corrected version
// System creates learning example automatically
```

### Example 3: Automated Prompt Improvement
```python
# Backend automatically runs nightly
optimizer = PromptOptimizer(agent_id, db, llm)
result = await optimizer.optimize(
    current_prompt=agent.system_prompt,
    learning_examples=approved_corrections,
    optimization_goals=['accuracy', 'clarity']
)

# Creates training run for review
```

### Example 4: A/B Test New Approach
```tsx
// Test new reasoning approach
const experiment = await createExperiment({
  agentId: 'audit-agent',
  name: 'Chain-of-thought reasoning',
  hypothesis: 'CoT improves complex task accuracy by 20%',
  controlConfig: { reasoning: 'direct' },
  treatmentConfig: { reasoning: 'chain-of-thought' },
});

await startExperiment(experiment.id);
// System tracks metrics, determines winner
```

## Troubleshooting

### Not Getting Enough Feedback?
- Add inline prompts: "How was this response?"
- Simplify feedback UI (one-click thumbs)
- Incentivize with "Help improve" messaging

### Annotations Taking Too Long?
- Batch similar examples together
- Create annotation guidelines
- Use AI-assisted pre-annotation
- Set up annotation SLAs

### Training Not Improving Quality?
- Check data quality (remove noise)
- Verify evaluation metrics
- Look for distribution shift
- Try different learning rates

### Deployment Degraded Metrics?
- Immediate rollback
- Check for edge cases
- Review evaluation coverage
- Improve regression tests

## Next Steps

1. **Read Full Guide**: `docs/AGENT_LEARNING_SYSTEM_GUIDE.md`
2. **Set Up Feedback**: Add `FeedbackCollector` to all agent UIs
3. **Create Annotation Workflow**: Build `/admin/learning/annotation` page
4. **Configure First Training Run**: Start with prompt optimization
5. **Set Up Monitoring**: Track key metrics in dashboard

## Support

- **Documentation**: `/docs/learning/`
- **API Docs**: `/api/docs#learning`
- **Team**: #agent-learning channel
- **Issues**: GitHub Issues with `learning` label

---

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: January 28, 2025
