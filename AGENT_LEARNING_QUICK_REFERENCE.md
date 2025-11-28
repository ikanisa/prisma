# Agent Learning System - Quick Reference Card

## 🎯 What Is It?

The Agent Learning System enables your AI agents to continuously improve through:
- User feedback collection
- Expert demonstrations
- Automated prompt optimization
- RAG improvements
- Safe A/B testing

## 🏃 Quick Start (5 Minutes)

### 1. Add Feedback to Any Agent Response

```tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={execution.output}
  onFeedbackSubmitted={() => toast.success('Thanks for your feedback!')}
/>
```

### 2. Monitor Learning Stats

```tsx
import { useLearningStats } from '@/hooks/useLearning';

const { data } = useLearningStats();
// data.pendingAnnotations
// data.totalExamples
// data.activeExperiments
```

### 3. Access Admin Tools

Visit: `/admin/learning/annotation` for expert review queue

## 📊 Core Concepts

### Learning Example Types

| Type | Description | Auto-Created From |
|------|-------------|-------------------|
| **positive** | Good examples to learn from | Thumbs up + high ratings |
| **negative** | Bad examples to avoid | Thumbs down + low ratings |
| **correction** | User-corrected outputs | User edits agent response |
| **demonstration** | Expert shows how it's done | Manual submission |
| **edge_case** | Unusual scenarios | System detection |
| **preference** | A vs B comparisons | A/B test results |

### Review Statuses

- `pending` → Needs expert review
- `in_review` → Currently being reviewed
- `approved` → Ready for training
- `rejected` → Not suitable
- `needs_revision` → Requires changes

## 🔌 API Quick Reference

### Submit Feedback

```bash
POST /api/learning/feedback
{
  "execution_id": "uuid",
  "agent_id": "uuid",
  "feedback_type": "thumbs_up|thumbs_down|correction",
  "rating": 1-5,
  "correction_text": "Improved response...",
  "issue_categories": ["incorrect", "incomplete"]
}
```

### Get Learning Stats

```bash
GET /api/learning/stats
# Returns: pending_annotations, total_examples, active_experiments, etc.
```

### Optimize Prompt

```bash
POST /api/learning/optimize-prompt
{
  "agent_id": "uuid",
  "current_prompt": "You are...",
  "optimization_goals": ["accuracy", "clarity"]
}
```

### Create Training Dataset

```bash
POST /api/learning/datasets
{
  "name": "Tax Agent Training v1",
  "agent_ids": ["uuid"],
  "domains": ["tax"],
  "min_quality_score": 0.7
}
```

### Launch A/B Experiment

```bash
POST /api/learning/experiments
{
  "name": "Improved Tax Prompt Test",
  "agent_id": "uuid",
  "hypothesis": "New prompt improves accuracy by 10%",
  "control_config": {...},
  "treatment_config": {...},
  "control_percentage": 50,
  "treatment_percentage": 50
}
```

## 🎨 React Hooks

### useFeedback

```tsx
import { useSubmitFeedback } from '@/hooks/useLearning';

const submitFeedback = useSubmitFeedback();

submitFeedback.mutate({
  executionId: 'uuid',
  agentId: 'uuid',
  feedbackType: 'thumbs_up',
  rating: 5
});
```

### useAnnotationQueue

```tsx
import { useAnnotationQueue } from '@/hooks/useLearning';

const { data: queue } = useAnnotationQueue({
  domain: 'accounting',
  agent: 'all',
  status: 'pending'
});
```

### useTrainingDatasets

```tsx
import { useTrainingDatasets } from '@/hooks/useLearning';

const { data: datasets } = useTrainingDatasets(organizationId);
```

## 🗄️ Database Queries

### Get Pending Annotations

```sql
SELECT * FROM learning_examples 
WHERE review_status = 'pending' 
ORDER BY created_at ASC
LIMIT 50;
```

### Get Agent Feedback Stats

```sql
SELECT 
  COUNT(*) as total,
  AVG(rating) as avg_rating,
  COUNT(CASE WHEN feedback_type = 'correction' THEN 1 END) as corrections
FROM agent_feedback
WHERE agent_id = $1 
  AND created_at > NOW() - INTERVAL '30 days';
```

### Get Top Issues

```sql
SELECT 
  unnest(issue_categories) as category,
  COUNT(*) as count
FROM agent_feedback
WHERE agent_id = $1
GROUP BY category
ORDER BY count DESC
LIMIT 10;
```

### Get Training-Ready Examples

```sql
SELECT * FROM learning_examples
WHERE review_status = 'approved'
  AND is_active = true
  AND quality_score >= 0.7
  AND agent_id = $1;
```

## 🔄 Common Workflows

### Workflow 1: User Correction → Training

1. User provides correction via `FeedbackCollector`
2. System creates `learning_example` with `review_status='pending'`
3. Expert reviews via `/admin/learning/annotation`
4. Expert approves → `review_status='approved'`
5. Example added to next training dataset
6. Prompt optimizer uses example to improve agent

### Workflow 2: Prompt Optimization

1. Collect 100+ approved examples for agent
2. Call `POST /api/learning/optimize-prompt`
3. System generates 3-5 prompt variants
4. System evaluates each variant against test set
5. Best variant returned with metrics
6. Create A/B experiment to test in production
7. If winner → deploy to all users

### Workflow 3: Expert Demonstration

1. Expert performs task manually
2. Submit via `POST /api/learning/demonstrations`
3. System stores as high-quality example
4. Auto-approved for immediate use
5. Behavior learner extracts patterns
6. Patterns used to guide future agent actions

## 💡 Best Practices

### For Feedback Collection

✅ **DO:**
- Add feedback UI to all agent responses
- Make it easy (thumbs up/down)
- Allow detailed feedback if needed
- Collect corrections when users edit responses

❌ **DON'T:**
- Force users to provide feedback
- Ask for feedback on every response
- Make feedback forms too long
- Ignore negative feedback

### For Expert Annotation

✅ **DO:**
- Review 20-30 examples per session
- Provide detailed quality scores
- Explain corrections clearly
- Look for patterns in issues

❌ **DON'T:**
- Approve low-quality examples
- Rush through reviews
- Approve without testing
- Ignore edge cases

### For Training

✅ **DO:**
- Use diverse examples
- Balance positive/negative examples
- Filter for quality (score >= 0.7)
- Include edge cases
- Test on validation set

❌ **DON'T:**
- Train on unreviewed examples
- Use biased datasets
- Skip validation
- Deploy without A/B testing

### For A/B Experiments

✅ **DO:**
- Define clear hypothesis
- Set minimum sample size (1000+)
- Run for at least 1 week
- Monitor closely
- Have rollback plan

❌ **DON'T:**
- Run multiple experiments simultaneously on same agent
- Make decisions before statistical significance
- Ignore negative results
- Skip safety checks

## 📈 Key Metrics

### Quality Metrics

- **Average Rating**: Target >= 4.0/5.0
- **Quality Score**: Target >= 0.75
- **Approval Rate**: Target >= 70%
- **Correction Rate**: Target <= 10%

### Learning Metrics

- **Examples per Day**: Target >= 50
- **Annotation Throughput**: Target >= 100/day
- **Training Frequency**: Weekly minimum
- **Active Experiments**: 1-3 concurrent

### Performance Metrics

- **Prompt Improvement**: Target +10% quality
- **RAG Relevance**: Target +15% precision
- **Error Reduction**: Target -20% errors
- **User Satisfaction**: Target +5% NPS

## 🚨 Troubleshooting

### No examples being created?

- Check if feedback collector is mounted
- Verify API endpoint is accessible
- Check database permissions
- Review error logs

### Examples stuck in pending?

- Ensure annotation queue is being monitored
- Check expert permissions
- Verify annotation workflow is enabled
- Review RLS policies

### Training runs failing?

- Check dataset has enough examples (min 50)
- Verify quality scores are calculated
- Check hyperparameters
- Review training logs

### A/B test inconclusive?

- Increase sample size
- Extend duration
- Check for confounding variables
- Verify metrics are tracking correctly

## 🔗 Quick Links

- **Full Guide**: `/docs/AGENT_LEARNING_SYSTEM_GUIDE.md`
- **Database Schema**: `/supabase/migrations/20260128100000_agent_learning_system_comprehensive.sql`
- **API Endpoints**: `/server/api/learning.py`
- **React Components**: `/src/components/learning/`
- **Python Backend**: `/server/learning/`

## ✅ Checklist for New Agent

- [ ] Add `FeedbackCollector` to agent UI
- [ ] Configure learning settings in agent config
- [ ] Set up annotation workflow
- [ ] Define quality criteria
- [ ] Create baseline dataset (100+ examples)
- [ ] Run initial prompt optimization
- [ ] Launch monitoring dashboard
- [ ] Schedule weekly review

---

**Quick Help**: For questions, see `/docs/AGENT_LEARNING_SYSTEM_GUIDE.md` or contact AI Platform Team

**Version**: 1.0.0 | **Last Updated**: 2025-01-28
