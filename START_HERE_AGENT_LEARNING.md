# 🎓 AI AGENT LEARNING SYSTEM - START HERE

> **Transform your AI agents from static tools into continuously evolving, self-improving intelligent systems**

## 🚀 What is This?

The Agent Learning System is Prisma Glow's comprehensive framework for collecting feedback, training improvements, and safely deploying better agent versions. It's the "brain behind the brain" - making your agents smarter every day.

## ✨ Quick Value Proposition

- **📊 Collect Feedback**: Simple thumbs up/down, detailed ratings, user corrections
- **👨‍🏫 Expert Review**: Quality scoring and annotation workflow
- **🤖 Automated Learning**: Prompt optimization, RAG tuning, behavioral cloning
- **🧪 A/B Testing**: Safe, data-driven deployments with automatic rollback
- **📈 Continuous Improvement**: Agents get better with every interaction

## 🎯 5-Minute Quick Start

### Step 1: Add Feedback to Your Agent UI

```tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

// Inside your agent execution result component
<AgentResponse response={execution.response} />

<FeedbackCollector
  executionId={execution.id}
  agentId={execution.agentId}
  agentOutput={execution.response.text}
  onFeedbackSubmitted={() => {
    toast.success('Thank you for helping improve our agents!');
  }}
/>
```

**What users see**:
- Quick thumbs up/down buttons
- Click "Give detailed feedback" for:
  - 5-star rating
  - Accuracy/helpfulness/clarity scores
  - Issue categories
  - Text feedback
  - Output correction editor

### Step 2: Check the Stats

```tsx
import { useLearningStats } from '@/hooks/learning/useLearning';

function LearningDashboard() {
  const { data: stats } = useLearningStats();
  
  return (
    <div>
      <MetricCard 
        label="Pending Annotations" 
        value={stats.pendingAnnotations} 
      />
      <MetricCard 
        label="Annotated Today" 
        value={stats.annotatedToday} 
      />
      <MetricCard 
        label="Active Training Runs" 
        value={stats.activeTrainingRuns} 
      />
    </div>
  );
}
```

### Step 3: Start Your First Training Run

```tsx
import { useStartTraining } from '@/hooks/learning/useLearning';

const { mutateAsync: startTraining } = useStartTraining();

// When you have ~100 approved examples
await startTraining({
  agentId: 'tax-agent-123',
  datasetId: 'approved-corrections-v1',
  trainingType: 'prompt_optimization',
  config: {
    optimization_goals: ['accuracy', 'completeness', 'clarity']
  }
});
```

### Step 4: Run Your First A/B Test

```tsx
import { useCreateExperiment } from '@/hooks/learning/useLearning';

const { mutateAsync: createExperiment } = useCreateExperiment();

const experiment = await createExperiment({
  agentId: 'tax-agent-123',
  name: 'Improved Tax Calculation Prompt',
  description: 'Testing clearer instructions for complex calculations',
  hypothesis: 'New prompt increases accuracy by 15% and reduces corrections by 10%',
  controlConfig: {
    system_prompt: currentPrompt
  },
  treatmentConfig: {
    system_prompt: optimizedPrompt
  }
});

// Start the experiment (splits traffic 50/50)
await startExperiment(experiment.id);
```

## 📚 Documentation Structure

```
.
├── README_AGENT_LEARNING.md (This file)                 - Quick start
├── docs/AGENT_LEARNING_SYSTEM_GUIDE.md                  - Comprehensive guide
└── AGENT_LEARNING_IMPLEMENTATION_COMPLETE.md            - Implementation status
```

**Choose your path**:
- **Just want to get started?** → Continue reading below
- **Need full technical details?** → Read `docs/AGENT_LEARNING_SYSTEM_GUIDE.md`
- **Want to verify implementation?** → Check `AGENT_LEARNING_IMPLEMENTATION_COMPLETE.md`

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LEARNING PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User Feedback → FeedbackCollector Component             │
│           ↓                                                  │
│  2. Data Storage → learning_examples table                  │
│           ↓                                                  │
│  3. Expert Review → Annotation Queue                        │
│           ↓                                                  │
│  4. Training Dataset → Approved examples                    │
│           ↓                                                  │
│  5. Learning Engine → Prompt/RAG/Behavior optimizer         │
│           ↓                                                  │
│  6. Evaluation → A/B test, regression test                  │
│           ↓                                                  │
│  7. Deployment → Canary → Gradual rollout → Full            │
│           ↓                                                  │
│  8. Monitoring → Metrics, rollback triggers                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Learning Types

| Type | Frequency | Human Oversight | Use Case |
|------|-----------|-----------------|----------|
| **Prompt Learning** | Continuous (hourly batches) | Review before deploy | Optimize system prompts, few-shot examples |
| **RAG Learning** | Daily | Automated + spot checks | Improve retrieval, chunking strategy |
| **Behavior Learning** | Weekly | Required approval | Learn from expert demonstrations |
| **Fine-Tuning** | Monthly | Full review | Specialized model updates |
| **Reinforcement Learning** | Experimental | Research team | Reward-based policy optimization |

## 🛠️ Implementation Checklist

### ✅ Already Complete

- [x] Database schema (6 tables with RLS policies)
- [x] Backend API (9 endpoints)
- [x] Learning engines (Prompt, RAG, Behavior)
- [x] Frontend components (FeedbackCollector)
- [x] React hooks (useLearning)
- [x] Comprehensive documentation

### ⏳ Your Next Steps

- [ ] **Week 1**: Add FeedbackCollector to 3 most-used agents
- [ ] **Week 2**: Create annotation dashboard at `/admin/learning/annotation`
- [ ] **Week 3**: Train expert reviewers, approve 50+ examples
- [ ] **Week 4**: Run first optimization, deploy with canary

## 🎨 UI Components Available

### FeedbackCollector

```tsx
<FeedbackCollector
  executionId={string}        // Required: execution ID
  agentId={string}            // Required: agent ID
  agentOutput={string}        // Required: agent's response text
  onFeedbackSubmitted={() => void}  // Optional: callback
/>
```

**Features**:
- Quick feedback (thumbs up/down)
- Detailed feedback dialog:
  - Overall star rating (1-5)
  - Dimension ratings (accuracy, helpfulness, clarity, completeness)
  - Issue categorization (8 categories)
  - Free-text feedback
  - Output correction editor
- Visual feedback states
- Loading states during submission

### React Hooks

```tsx
// Submit feedback
const submitFeedback = useSubmitFeedback();
await submitFeedback.mutateAsync({...});

// Get annotation queue
const { data: queue } = useAnnotationQueue({ domain: 'tax' });

// Submit annotation
const submitAnnotation = useSubmitAnnotation();
await submitAnnotation.mutateAsync({...});

// Get stats
const { data: stats } = useLearningStats();

// Training runs
const { data: runs } = useTrainingRuns(agentId);
const startTraining = useStartTraining();

// Experiments
const { data: experiments } = useLearningExperiments(agentId);
const createExperiment = useCreateExperiment();
```

## 🔌 API Endpoints

### Feedback Collection
```http
POST /api/learning/feedback
Content-Type: application/json

{
  "executionId": "uuid",
  "agentId": "uuid",
  "feedbackType": "correction",
  "rating": 4,
  "feedbackText": "Good but missing details on...",
  "correctionText": "Corrected output...",
  "issueCategories": ["incomplete"],
  "dimensions": {
    "accuracy": 5,
    "helpfulness": 4,
    "clarity": 4,
    "completeness": 3
  }
}
```

### Get Statistics
```http
GET /api/learning/stats

Response:
{
  "pendingAnnotations": 42,
  "annotatedToday": 15,
  "activeTrainingRuns": 2,
  "activeExperiments": 1
}
```

### Start Training
```http
POST /api/learning/training/start
Content-Type: application/json

{
  "agentId": "uuid",
  "datasetId": "uuid",
  "trainingType": "prompt_optimization",
  "config": {
    "optimization_goals": ["accuracy", "completeness"]
  }
}
```

### Create Experiment
```http
POST /api/learning/experiments
Content-Type: application/json

{
  "agentId": "uuid",
  "name": "Test new approach",
  "description": "...",
  "hypothesis": "...",
  "controlConfig": {...},
  "treatmentConfig": {...}
}
```

## 📈 Metrics to Track

### Quality Metrics
- **User Satisfaction**: % of ratings >= 4 stars (target: >80%)
- **Correction Rate**: % of outputs corrected by users (target: <5%)
- **Task Completion**: % of tasks completed successfully (target: >90%)
- **Expert Approval**: % of examples approved by experts (target: >75%)

### Performance Metrics
- **Latency**: p95 response time (target: <2s)
- **Error Rate**: % of failed executions (target: <1%)
- **Retrieval Accuracy**: % of relevant docs retrieved (target: >90%)
- **Token Efficiency**: Cost per task (track trend)

### Business Metrics
- **User Adoption**: % of users regularly using agents
- **Task Automation**: % of manual tasks now automated
- **Cost Savings**: $ saved vs manual processes
- **ROI**: Return on AI investment

## 🛡️ Safety Guardrails

### Automatic Rollback Triggers
System automatically rolls back to previous version if:
- User satisfaction drops >10%
- Error rate increases >20%
- Latency increases >50%
- Safety violations detected (harmful/inappropriate outputs)

### Human Oversight Required
- **Prompt Learning**: Expert review before deployment
- **Behavior Learning**: Required approval for all changes
- **Fine-Tuning**: Full review cycle with test results
- **Experiments**: Review hypothesis and configs

### Quality Gates
- Minimum quality score: 0.8/1.0
- Minimum sample size for experiments: 1,000 interactions
- Minimum duration for A/B tests: 1 week
- Statistical significance: p < 0.05

## 🎯 Success Metrics

### Phase 1: Foundation (✅ COMPLETE)
- ✅ Database schema deployed
- ✅ API endpoints implemented
- ✅ Frontend components created
- ✅ Documentation written

### Phase 2: Adoption (IN PROGRESS - You Are Here)
- ⏳ 80% of agents have feedback collection enabled
- ⏳ 5+ expert reviewers trained
- ⏳ 500+ approved training examples
- ⏳ First successful optimization deployed

### Phase 3: Scale (NEXT)
- ⏳ Automated daily training pipeline
- ⏳ 10+ successful A/B tests
- ⏳ 20%+ improvement in user satisfaction
- ⏳ 50%+ reduction in correction rate

### Phase 4: Excellence (FUTURE)
- ⏳ Self-improving agents
- ⏳ Cross-agent knowledge transfer
- ⏳ Industry-leading quality scores
- ⏳ Continuous innovation pipeline

## 💡 Best Practices

### ✅ DO
- Start with 1-2 high-value agents
- Collect diverse examples across all capabilities
- Require expert review for all deployments
- Use A/B testing for significant changes
- Monitor metrics closely during rollout
- Maintain golden test datasets
- Document all changes and decisions

### ❌ DON'T
- Deploy without evaluation
- Train on unreviewed user feedback
- Skip safety validation
- Over-fit to recent examples
- Fine-tune too frequently (causes instability)
- Ignore user complaints
- Rush through review process

## 🐛 Troubleshooting

### Low Feedback Volume
**Problem**: Not enough user feedback  
**Solutions**:
- Add prominent feedback buttons
- Send reminder emails
- Gamify feedback (leaderboards, badges)
- Simplify feedback UI (one-click thumbs)

### Poor Quality Annotations
**Problem**: Inconsistent expert reviews  
**Solutions**:
- Create annotation guidelines
- Train reviewers with examples
- Implement inter-rater reliability checks
- Provide feedback to reviewers

### Training Doesn't Improve Quality
**Problem**: Metrics don't improve after training  
**Solutions**:
- Check data quality (remove noise)
- Verify evaluation metrics are correct
- Look for distribution shift
- Try different learning approaches

### Deployment Degraded Metrics
**Problem**: Quality drops after deployment  
**Solutions**:
- Immediate rollback (automatic or manual)
- Review evaluation coverage
- Check for edge cases
- Improve regression test suite

## 📞 Support

- **Full Documentation**: [`docs/AGENT_LEARNING_SYSTEM_GUIDE.md`](docs/AGENT_LEARNING_SYSTEM_GUIDE.md)
- **Implementation Status**: [`AGENT_LEARNING_IMPLEMENTATION_COMPLETE.md`](AGENT_LEARNING_IMPLEMENTATION_COMPLETE.md)
- **API Reference**: `/api/docs#learning` (when server running)
- **Team Chat**: #agent-learning
- **Email**: learning@prismaglow.com

## 🎉 Ready to Get Started?

1. **Add feedback collection** to your first agent (copy code from Quick Start above)
2. **Collect 100+ feedback samples** in the first week
3. **Set up annotation workflow** for expert review
4. **Run your first training** when you have 50+ approved examples
5. **Deploy with A/B testing** and monitor closely

---

**System Status**: ✅ Production Ready  
**Last Updated**: January 28, 2025  
**Version**: 1.0.0  
**Maintained By**: AI Platform Team

**Questions?** Start with this README, then dive into the comprehensive guide for details.
