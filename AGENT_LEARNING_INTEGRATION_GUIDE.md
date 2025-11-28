# Agent Learning System - Integration Guide

## 🎯 Purpose
This guide shows how to integrate the Agent Learning System into your existing Prisma Glow application.

## 📋 Prerequisites

- PostgreSQL database with Supabase
- FastAPI backend running
- React frontend with TanStack Query
- User authentication working
- Agent execution system in place

## 🔧 Integration Steps

### STEP 1: Deploy Database Schema

```bash
# Navigate to project root
cd /path/to/prisma

# Apply the migration
psql "$DATABASE_URL" -f supabase/migrations/20260128100000_agent_learning_system_comprehensive.sql

# Verify installation
psql "$DATABASE_URL" <<SQL
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'learning_%';
SQL
```

Expected output:
```
tablename
---------------------------
learning_examples
learning_experiments
```

### STEP 2: Register API Router

**File**: `server/main.py`

```python
from server.api import learning as learning_api

# Add to your FastAPI app
app.include_router(learning_api.router)
```

Verify:
```bash
curl http://localhost:8000/docs
# Should see /api/learning/* endpoints
```

### STEP 3: Add Feedback to Agent Responses

**File**: Your agent response component (e.g., `src/components/agents/AgentResponse.tsx`)

```tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

export function AgentResponse({ execution }: { execution: AgentExecution }) {
  return (
    <div>
      {/* Your existing response UI */}
      <div className="agent-output">
        {execution.output}
      </div>
      
      {/* ADD THIS: */}
      <div className="mt-6">
        <FeedbackCollector
          executionId={execution.id}
          agentId={execution.agent_id}
          agentOutput={execution.output}
          onFeedbackSubmitted={() => {
            // Optional: show thank you message, refresh data, etc.
            console.log('Feedback submitted!');
          }}
        />
      </div>
    </div>
  );
}
```

### STEP 4: Add Annotation Route

**File**: Your router configuration (e.g., `src/App.tsx` or routing file)

```tsx
import ExpertAnnotationPage from '@/pages/admin/learning/annotation';

// Add to your routes
<Route path="/admin/learning/annotation" element={<ExpertAnnotationPage />} />
```

### STEP 5: Add Navigation Link

**File**: Admin navigation (e.g., `src/components/layout/AdminNav.tsx`)

```tsx
import { Sparkles } from 'lucide-react';

// Add to admin menu
<NavLink to="/admin/learning/annotation">
  <Sparkles className="w-4 h-4" />
  <span>Learning & Annotation</span>
  {stats?.pending_annotations > 0 && (
    <Badge variant="destructive">{stats.pending_annotations}</Badge>
  )}
</NavLink>
```

### STEP 6: Configure Background Jobs

**Option A: Cron Jobs** (Simple)

```bash
# Add to crontab
# Process feedback hourly
0 * * * * curl -X POST http://localhost:8000/api/learning/process-feedback

# Update RAG daily at 2am
0 2 * * * curl -X POST http://localhost:8000/api/learning/update-rag

# Generate datasets weekly (Sunday 3am)
0 3 * * 0 curl -X POST http://localhost:8000/api/learning/curate-datasets
```

**Option B: Celery/Background Worker** (Recommended)

**File**: `server/learning_jobs.py`

```python
from celery import Celery
from server.learning import FeedbackCollector, RAGTrainer, PromptOptimizer

celery_app = Celery('learning', broker='redis://localhost:6379/0')

@celery_app.task
def process_feedback():
    """Run hourly to process new feedback into learning examples."""
    # Implementation already exists in feedback_collector.py
    pass

@celery_app.task
def update_rag_scores():
    """Run daily to update chunk relevance from feedback."""
    # Implementation already exists in rag_trainer.py
    pass

@celery_app.task
def generate_training_datasets():
    """Run weekly to create dataset candidates."""
    # Implementation already exists
    pass
```

Start worker:
```bash
celery -A server.learning_jobs worker --beat --loglevel=info
```

### STEP 7: Set Up Monitoring

**File**: `src/components/admin/LearningDashboard.tsx`

```tsx
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function LearningDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['/learning/stats'],
    queryFn: async () => {
      const response = await apiClient.get('/learning/stats');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Pending Review"
        value={stats?.pending_annotations || 0}
        icon={AlertCircle}
        trend={stats?.annotation_trend}
      />
      <StatCard
        title="Reviewed Today"
        value={stats?.annotated_today || 0}
        icon={CheckCircle}
        trend="up"
      />
      <StatCard
        title="Active Experiments"
        value={stats?.active_experiments || 0}
        icon={FlaskConical}
      />
      <StatCard
        title="Training Runs"
        value={stats?.running_training || 0}
        icon={TrendingUp}
      />
    </div>
  );
}
```

### STEP 8: Create API Client Helpers

**File**: `src/lib/learning-api.ts`

```typescript
import { apiClient } from './api-client';

export const learningAPI = {
  // Feedback
  submitFeedback: (data: FeedbackSubmission) =>
    apiClient.post('/learning/feedback', data),

  getFeedbackStats: (agentId: string, days: number = 30) =>
    apiClient.get(`/learning/feedback/stats?agent_id=${agentId}&days=${days}`),

  // Examples
  getAnnotationQueue: (filters: AnnotationFilters) =>
    apiClient.get('/learning/examples/queue', { params: filters }),

  getLearningExample: (id: string) =>
    apiClient.get(`/learning/examples/${id}`),

  // Annotations
  submitAnnotation: (data: AnnotationSubmission) =>
    apiClient.post('/learning/annotations', data),

  // Datasets
  createDataset: (data: DatasetCreate) =>
    apiClient.post('/learning/datasets', data),

  addExamplesToDataset: (datasetId: string, exampleIds: string[], split: string) =>
    apiClient.post(`/learning/datasets/${datasetId}/examples`, {
      example_ids: exampleIds,
      split,
    }),

  // Training
  createTrainingRun: (data: TrainingRunCreate) =>
    apiClient.post('/learning/training/runs', data),

  getTrainingRuns: (agentId?: string) =>
    apiClient.get('/learning/training/runs', {
      params: { agent_id: agentId },
    }),

  // Experiments
  createExperiment: (data: ExperimentCreate) =>
    apiClient.post('/learning/experiments', data),

  updateExperimentStatus: (experimentId: string, status: string) =>
    apiClient.patch(`/learning/experiments/${experimentId}/status`, { status }),

  // Stats
  getLearningStats: () =>
    apiClient.get('/learning/stats'),
};
```

### STEP 9: Create React Hooks

**File**: `src/hooks/useLearning.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningAPI } from '@/lib/learning-api';

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: learningAPI.submitFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/learning/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/learning/feedback/stats'] });
    },
  });
}

export function useAnnotationQueue(filters: AnnotationFilters) {
  return useQuery({
    queryKey: ['/learning/examples/queue', filters],
    queryFn: () => learningAPI.getAnnotationQueue(filters),
  });
}

export function useSubmitAnnotation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: learningAPI.submitAnnotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/learning/examples/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/learning/stats'] });
    },
  });
}

export function useLearningStats() {
  return useQuery({
    queryKey: ['/learning/stats'],
    queryFn: learningAPI.getLearningStats,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useTrainingRuns(agentId?: string) {
  return useQuery({
    queryKey: ['/learning/training/runs', agentId],
    queryFn: () => learningAPI.getTrainingRuns(agentId),
  });
}
```

### STEP 10: Add Permissions Check

**File**: `src/components/learning/AnnotationGuard.tsx`

```tsx
import { useCurrentUser } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function AnnotationGuard({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  
  // Only managers and admins can annotate
  if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
```

Use in route:
```tsx
<Route
  path="/admin/learning/annotation"
  element={
    <AnnotationGuard>
      <ExpertAnnotationPage />
    </AnnotationGuard>
  }
/>
```

## 🧪 Testing

### Test Feedback Collection

```bash
# 1. Start your app
pnpm dev

# 2. Navigate to an agent response
# 3. Click thumbs down
# 4. Fill in detailed feedback
# 5. Submit

# 6. Verify in database
psql "$DATABASE_URL" -c "SELECT * FROM agent_feedback ORDER BY created_at DESC LIMIT 1;"
```

### Test Annotation Workflow

```bash
# 1. Create some test learning examples
curl -X POST http://localhost:8000/api/learning/examples \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "example_type": "correction",
    "input_text": "What is IFRS 15?",
    "expected_output": "IFRS 15 is the revenue recognition standard...",
    "source_type": "user_feedback",
    "domain": "accounting"
  }'

# 2. Navigate to /admin/learning/annotation
# 3. Review the example
# 4. Submit annotation

# 5. Verify
psql "$DATABASE_URL" -c "SELECT * FROM expert_annotations ORDER BY created_at DESC LIMIT 1;"
```

### Test API Endpoints

```bash
# Get stats
curl http://localhost:8000/api/learning/stats

# Get annotation queue
curl http://localhost:8000/api/learning/examples/queue?status=pending

# Create dataset
curl -X POST http://localhost:8000/api/learning/datasets \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Dataset", "version": "1.0.0"}'
```

## 📊 Monitoring

Add these queries to your monitoring dashboard:

```sql
-- Feedback submission rate (per day)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as submissions,
  AVG(rating) as avg_rating
FROM agent_feedback
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Annotation throughput
SELECT 
  DATE(created_at) as date,
  COUNT(*) as annotations,
  AVG(technical_accuracy) as avg_quality
FROM expert_annotations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Learning examples by status
SELECT 
  review_status,
  COUNT(*) as count
FROM learning_examples
GROUP BY review_status;

-- Training run status
SELECT 
  status,
  COUNT(*) as count,
  AVG(progress_percentage) as avg_progress
FROM training_runs
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY status;
```

## 🚨 Troubleshooting

### Feedback not saving
```typescript
// Check network tab for errors
// Verify auth token is being sent
// Check server logs for database errors

// Debug query:
SELECT * FROM agent_feedback ORDER BY created_at DESC LIMIT 10;
```

### Annotation queue empty
```sql
-- Check if examples exist
SELECT COUNT(*), review_status 
FROM learning_examples 
GROUP BY review_status;

-- Check filters
SELECT * FROM learning_examples 
WHERE review_status = 'pending' 
LIMIT 10;
```

### Training run not starting
```sql
-- Check run status
SELECT id, name, status, metrics 
FROM training_runs 
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Check dataset exists and has examples
SELECT 
  td.name,
  COUNT(de.id) as example_count
FROM training_datasets td
LEFT JOIN dataset_examples de ON de.dataset_id = td.id
GROUP BY td.id, td.name;
```

## ✅ Integration Checklist

- [ ] Database migration applied successfully
- [ ] API endpoints accessible at `/api/learning/*`
- [ ] Feedback collector visible on agent responses
- [ ] Feedback submissions saving to database
- [ ] Annotation page accessible at `/admin/learning/annotation`
- [ ] Annotation queue loading correctly
- [ ] Annotations saving to database
- [ ] Stats dashboard showing correct metrics
- [ ] Background jobs configured (if using)
- [ ] Permissions enforced (manager-only access)
- [ ] Monitoring queries added to dashboard
- [ ] Documentation shared with team

## 🎓 Training Materials

Share these with your team:

1. **For End Users**: "How to provide feedback" - 2 min guide
2. **For Domain Experts**: "Annotation best practices" - 15 min training
3. **For Managers**: "Creating training datasets" - 30 min workshop
4. **For Developers**: This integration guide

## 📞 Support

If you encounter issues:

1. Check database logs: `tail -f /var/log/postgresql/postgresql.log`
2. Check API logs: `tail -f server.log`
3. Check browser console for frontend errors
4. Review this integration guide
5. Consult `AGENT_LEARNING_SYSTEM_COMPLETE.md`

## 🎉 Success Criteria

After integration, you should be able to:

- ✅ Submit feedback on any agent response
- ✅ See feedback appear in annotation queue
- ✅ Review and approve/reject examples
- ✅ Create training datasets
- ✅ Launch training runs
- ✅ View learning statistics
- ✅ Monitor system health

**Estimated integration time**: 2-4 hours (depending on your codebase)

**Ready to go!** Start with Step 1 and work through sequentially.
