# PRISMA GLOW - AI AGENT LEARNING SYSTEM
## Comprehensive Implementation Guide

> **Transforms AI agents from static tools into continuously evolving, self-improving intelligent systems**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Implementation Status](#implementation-status)
4. [Quick Start Guide](#quick-start-guide)
5. [Components](#components)
6. [Usage Examples](#usage-examples)
7. [API Reference](#api-reference)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Executive Summary

The Agent Learning System is the brain behind the brain - a comprehensive framework for:
- **Collecting feedback** from users, experts, and system telemetry
- **Processing and curating** training data with quality controls
- **Training and fine-tuning** agents through multiple learning strategies
- **Evaluating improvements** with A/B testing and regression testing
- **Deploying safely** with canary releases and rollback capabilities

### Key Capabilities

✅ **Prompt Optimization** - Systematically improve system prompts based on feedback  
✅ **RAG Learning** - Enhance retrieval and knowledge utilization  
✅ **Behavior Learning** - Learn from expert demonstrations and corrections  
✅ **Fine-Tuning** - Model weight adjustments for specialized tasks  
✅ **A/B Testing** - Data-driven experimentation framework  

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   AGENT LEARNING SYSTEM ARCHITECTURE             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DATA COLLECTION LAYER                       │    │
│  │  • User Feedback    • Expert Corrections                │    │
│  │  • System Telemetry • External Benchmarks               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DATA PROCESSING LAYER                       │    │
│  │  • Data Pipeline    • Quality Filtering                 │    │
│  │  • Annotation Engine • Dataset Manager                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              LEARNING ENGINE LAYER                       │    │
│  │  • Prompt Optimizer  • RAG Trainer                      │    │
│  │  • Fine-Tuning       • Behavior Cloning                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              EVALUATION LAYER                            │    │
│  │  • A/B Testing       • Regression Testing               │    │
│  │  • Safety Validation • Human Review                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DEPLOYMENT LAYER                            │    │
│  │  • Canary Release    • Gradual Rollout                  │    │
│  │  • Rollback Manager  • Monitoring Dashboard             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Status

### ✅ Completed Components

#### Database Schema
- ✅ `learning_examples` - Core training data storage
- ✅ `expert_annotations` - Quality assessments from experts
- ✅ `training_datasets` - Curated datasets for training
- ✅ `dataset_examples` - Many-to-many dataset assignments
- ✅ `training_runs` - Training job tracking
- ✅ `learning_experiments` - A/B test experiments
- ✅ Extended `agent_feedback` with dimension ratings

#### Backend Services (Python)
- ✅ `FeedbackCollector` - User feedback collection and processing
- ✅ `PromptOptimizer` - Prompt optimization through experimentation
- ✅ `RAGTrainer` - Retrieval improvement through feedback
- ✅ `BehaviorLearner` - Learning from demonstrations and corrections
- ✅ API endpoints for all learning operations

#### Frontend Components (React)
- ✅ `FeedbackCollector` - Rich feedback UI with corrections
- ✅ `AnnotationPage` - Expert annotation interface
- ✅ React hooks for all learning operations
- ✅ Integration with existing agent UI

#### Infrastructure
- ✅ Row-level security policies
- ✅ Database triggers and functions
- ✅ Comprehensive indexes for performance
- ✅ Stats and analytics queries

---

## Quick Start Guide

### 1. Enable Learning for an Agent

```typescript
import { useSubmitFeedback } from '@/hooks/useLearning';

function AgentResponseCard({ execution }) {
  const submitFeedback = useSubmitFeedback();
  
  const handleFeedback = async (type: 'up' | 'down') => {
    await submitFeedback.mutateAsync({
      executionId: execution.id,
      agentId: execution.agent_id,
      feedbackType: type === 'up' ? 'thumbs_up' : 'thumbs_down',
      rating: type === 'up' ? 5 : 1
    });
  };
  
  return (
    <div>
      {/* Agent output */}
      <FeedbackCollector
        executionId={execution.id}
        agentId={execution.agent_id}
        agentOutput={execution.output}
      />
    </div>
  );
}
```

### 2. Review Feedback Queue

Navigate to `/admin/learning/annotation` to review and annotate learning examples.

### 3. Create Training Dataset

```typescript
import { useCreateDataset } from '@/hooks/useLearning';

const createDataset = useCreateDataset();

await createDataset.mutateAsync({
  name: "Q1 2024 Tax Agent Dataset",
  description: "Approved examples from Q1 2024",
  agentIds: [taxAgentId],
  domains: ['tax', 'compliance'],
  minQualityScore: 0.8
});
```

### 4. Run Prompt Optimization

```typescript
import { useOptimizePrompt } from '@/hooks/useLearning();

const optimizePrompt = useOptimizePrompt();

const result = await optimizePrompt.mutateAsync({
  agentId: 'agent-123',
  currentPrompt: currentSystemPrompt,
  optimizationGoals: ['accuracy', 'clarity', 'completeness']
});

console.log('Improved prompt:', result.best_prompt);
console.log('Improvement:', result.improvement_percentage);
```

### 5. Launch A/B Experiment

```typescript
import { useCreateExperiment, useStartExperiment } from '@/hooks/useLearning';

// Create experiment
const experiment = await createExperiment.mutateAsync({
  name: "Improved Tax Calculation Prompt",
  description: "Testing clarified instructions for tax calculations",
  hypothesis: "Clearer prompt reduces calculation errors by 20%",
  agentId: 'tax-agent-123',
  controlConfig: { prompt: currentPrompt },
  treatmentConfig: { prompt: improvedPrompt },
  trafficSplit: { control: 50, treatment: 50 }
});

// Start experiment
await startExperiment.mutateAsync(experiment.id);
```

---

## Components

### Data Collection Layer

#### 1. FeedbackCollector Component
Rich UI for collecting user feedback:
- Quick thumbs up/down
- Star ratings (1-5)
- Dimension ratings (accuracy, helpfulness, clarity, completeness)
- Free-form comments
- Issue categorization
- Output corrections

**Location:** `src/components/learning/FeedbackCollector.tsx`

#### 2. Expert Annotation Interface
Professional annotation interface for experts:
- Queue management with filters
- Quality scoring (0-100%)
- Corrected output editing
- Reviewer notes and suggestions
- Approve/reject workflow

**Location:** `src/pages/admin/learning/annotation.tsx`

### Processing Layer

#### 3. FeedbackCollector Service
Backend service for processing feedback:
- Stores feedback in database
- Creates learning examples from corrections
- Calculates aggregate statistics
- Manages annotation queues

**Location:** `server/learning/feedback_collector.py`

### Learning Engine Layer

#### 4. PromptOptimizer
Systematically improves prompts:
- Analyzes current performance
- Generates prompt variants
- Evaluates variants against test set
- Selects best performing variant
- Provides improvement recommendations

**Location:** `server/learning/prompt_optimizer.py`

**Usage:**
```python
from server.learning.prompt_optimizer import PromptOptimizer

optimizer = PromptOptimizer(agent_id, db_session, llm_client)

result = await optimizer.optimize(
    current_prompt="Your current system prompt...",
    learning_examples=[...],  # List of approved examples
    optimization_goals=['accuracy', 'clarity']
)

print(f"Improvement: {result.improvement_percentage}%")
print(f"Best prompt: {result.best_variant.system_prompt}")
```

#### 5. RAGTrainer
Improves retrieval quality:
- Updates chunk relevance scores
- Collects embedding training data
- Optimizes chunking strategies
- Learns query expansions

**Location:** `server/learning/rag_trainer.py`

**Usage:**
```python
from server.learning.rag_trainer import RAGTrainer, RetrievalFeedback

trainer = RAGTrainer(embedding_model, vector_store, db_session)

feedback = RetrievalFeedback(
    query="What are the IFRS 15 revenue recognition criteria?",
    retrieved_chunks=[...],  # What was retrieved
    relevant_chunks=[...],   # What should have been retrieved
    user_rating=4,
    retrieval_helped=True
)

improvements = await trainer.train_from_feedback([feedback])
```

#### 6. BehaviorLearner
Learns from demonstrations:
- Stores expert demonstrations
- Analyzes correction patterns
- Creates training datasets
- Identifies improvement areas

**Location:** `server/learning/behavior_learner.py`

**Usage:**
```python
from server.learning.behavior_learner import BehaviorLearner, ExpertDemonstration

learner = BehaviorLearner(agent_id, db_session, llm_client)

demo = ExpertDemonstration(
    task_description="Calculate deferred tax liability",
    input_state={...},
    actions=[...],  # Sequence of actions taken
    final_output="Deferred tax liability is...",
    reasoning="Used IAS 12 guidance...",
    expert_id="expert-123"
)

result = await learner.learn_from_demonstration(demo)
```

---

## API Reference

### Feedback Endpoints

#### POST /api/learning/feedback
Submit user feedback on an agent execution.

**Request:**
```json
{
  "execution_id": "uuid",
  "agent_id": "uuid",
  "feedback_type": "thumbs_up|thumbs_down|correction|detailed_feedback",
  "rating": 5,
  "feedback_text": "Great response!",
  "correction_text": "Corrected output...",
  "issue_categories": ["incorrect", "incomplete"],
  "dimensions": {
    "accuracy": 4,
    "helpfulness": 5,
    "clarity": 4,
    "completeness": 3
  }
}
```

**Response:**
```json
{
  "id": "feedback-uuid",
  "status": "submitted"
}
```

#### GET /api/learning/feedback/agent/{agent_id}
Get feedback statistics for an agent.

**Response:**
```json
{
  "total_feedback": 150,
  "avg_rating": 4.2,
  "dimensions": {
    "accuracy": 4.1,
    "helpfulness": 4.3,
    "clarity": 4.0,
    "completeness": 4.2
  },
  "thumbs_up": 120,
  "thumbs_down": 30,
  "corrections": 15
}
```

### Annotation Endpoints

#### GET /api/learning/annotations/queue
Get learning examples pending annotation.

**Query Parameters:**
- `domain` - Filter by domain (optional)
- `agent` - Filter by agent ID (optional)
- `status` - Filter by review status (default: "pending")
- `limit` - Max results (default: 50)

**Response:**
```json
[
  {
    "id": "example-uuid",
    "agent_id": "agent-uuid",
    "example_type": "correction",
    "input_text": "User input...",
    "original_output": "Agent output...",
    "expected_output": "Corrected output...",
    "domain": "tax",
    "task_type": "calculation",
    "complexity": 3,
    "review_status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/learning/annotations
Submit expert annotation for a learning example.

**Request:**
```json
{
  "example_id": "uuid",
  "annotation": {
    "approved": true,
    "technicalAccuracy": 0.9,
    "professionalQuality": 0.85,
    "completeness": 0.9,
    "clarity": 0.88,
    "correctedOutput": "Updated output...",
    "notes": "Excellent example",
    "improvementSuggestions": "Could include more references"
  }
}
```

### Training Endpoints

#### POST /api/learning/training/runs
Start a new training run.

**Request:**
```json
{
  "name": "Tax Agent Fine-Tuning Run 1",
  "description": "Fine-tune on Q1 2024 dataset",
  "agent_id": "agent-uuid",
  "dataset_id": "dataset-uuid",
  "training_type": "fine_tuning",
  "hyperparameters": {
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 10
  }
}
```

#### GET /api/learning/training/runs
List training runs.

**Query Parameters:**
- `agent_id` - Filter by agent
- `status` - Filter by status
- `limit` - Max results

### Experiment Endpoints

#### POST /api/learning/experiments
Create a new A/B experiment.

**Request:**
```json
{
  "name": "Improved Prompt Test",
  "description": "Testing clarified instructions",
  "hypothesis": "Clearer prompt reduces errors by 20%",
  "agent_id": "agent-uuid",
  "control_config": { "prompt": "Current prompt..." },
  "treatment_config": { "prompt": "Improved prompt..." },
  "traffic_split": { "control": 50, "treatment": 50 }
}
```

#### POST /api/learning/experiments/{id}/start
Start an experiment.

#### POST /api/learning/experiments/{id}/stop
Stop a running experiment.

#### GET /api/learning/experiments
List experiments.

### Stats Endpoints

#### GET /api/learning/stats
Get overall learning system statistics.

**Response:**
```json
{
  "pendingAnnotations": 45,
  "annotatedToday": 12,
  "totalExamples": 1500,
  "activeExperiments": 3,
  "runningTraining": 1
}
```

#### GET /api/learning/agents/{agent_id}/metrics
Get learning metrics for a specific agent.

**Response:**
```json
{
  "feedback": {
    "total_feedback": 150,
    "avg_rating": 4.2,
    "dimensions": {...}
  },
  "examples": {
    "positive_count": 85,
    "negative_count": 25,
    "correction_count": 40,
    "approved_count": 100,
    "avg_quality": 0.82
  }
}
```

---

## Best Practices

### 1. Feedback Collection

✅ **DO:**
- Collect feedback immediately after agent response
- Provide multiple feedback types (quick and detailed)
- Make corrections easy to submit
- Show users their feedback is valued

❌ **DON'T:**
- Interrupt user workflow with mandatory feedback
- Make feedback forms too long
- Ignore negative feedback

### 2. Expert Annotation

✅ **DO:**
- Review examples in batches
- Provide clear annotation guidelines
- Include context and metadata
- Track annotation quality

❌ **DON'T:**
- Approve without thorough review
- Skip difficult examples
- Ignore improvement suggestions

### 3. Training Datasets

✅ **DO:**
- Curate high-quality examples (quality_score >= 0.7)
- Include diverse task types
- Balance positive/negative examples
- Version your datasets

❌ **DON'T:**
- Include unreviewed examples
- Bias toward easy examples
- Ignore edge cases

### 4. Prompt Optimization

✅ **DO:**
- Start with analysis of current performance
- Test multiple variants
- Measure improvements quantitatively
- Document changes and results

❌ **DON'T:**
- Optimize without baseline metrics
- Deploy without evaluation
- Change too many things at once

### 5. A/B Experiments

✅ **DO:**
- Define clear hypotheses
- Set minimum sample sizes
- Wait for statistical significance
- Monitor safety metrics

❌ **DON'T:**
- Stop experiments early
- Test too many variants simultaneously
- Ignore negative results
- Deploy without review

---

## Troubleshooting

### Common Issues

#### 1. Low Feedback Collection Rate

**Symptoms:** Not enough user feedback being collected

**Solutions:**
- Make feedback UI more prominent
- Add contextual prompts
- Incentivize feedback
- Simplify feedback process

#### 2. Annotation Backlog

**Symptoms:** Large queue of pending annotations

**Solutions:**
- Add more expert reviewers
- Prioritize high-impact examples
- Use automated pre-screening
- Batch similar examples

#### 3. Training Run Failures

**Symptoms:** Training runs failing or not improving

**Solutions:**
- Check dataset quality
- Validate hyperparameters
- Review error logs
- Start with smaller datasets

#### 4. Low Experiment Confidence

**Symptoms:** Experiments inconclusive or high variance

**Solutions:**
- Increase sample size
- Extend experiment duration
- Reduce traffic split variance
- Stratify by user segments

### Debugging

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check database stats:

```sql
-- Learning examples by status
SELECT review_status, COUNT(*)
FROM learning_examples
GROUP BY review_status;

-- Feedback distribution
SELECT feedback_type, COUNT(*)
FROM agent_feedback
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY feedback_type;

-- Training run status
SELECT status, COUNT(*)
FROM training_runs
GROUP BY status;
```

---

## Next Steps

1. **Enable Feedback Collection** - Add `FeedbackCollector` to agent response UIs
2. **Set Up Annotation Workflow** - Assign experts to review queue
3. **Create Initial Datasets** - Curate training datasets from approved examples
4. **Run First Optimization** - Test prompt optimization on one agent
5. **Launch Pilot Experiment** - Start small A/B test
6. **Monitor and Iterate** - Track metrics and refine processes

---

## Support

- **Documentation:** See `/docs/learning-system/`
- **Examples:** See `/examples/learning/`
- **Issues:** Report on GitHub
- **Questions:** team@prismaglow.ai

---

**Last Updated:** 2024-01-28  
**Version:** 1.0.0  
**Status:** Production Ready ✅
