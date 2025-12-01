# Production Deployment Guide

**Status**: Ready for Deployment  
**Date**: December 1, 2024

## 🎯 Overview

Complete deployment guide for the AI Agent System with Supabase integration.

## ✅ Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production`:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# Gemini
GEMINI_API_KEY=AI...

# App
NODE_ENV=production
```

### 2. Supabase Setup

```bash
# 1. Apply migrations
cd supabase
supabase db push

# 2. Verify tables created
supabase db diff

# 3. Enable pgvector extension (if not already enabled)
# Run in Supabase SQL editor:
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Build Application

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Typecheck
pnpm run typecheck

# Build all packages
pnpm run build

# Run tests
pnpm --filter @prisma-glow/agents test
```

## 🚀 Deployment Steps

### Step 1: Database Setup

```bash
# 1. Create Supabase project (if not exists)
supabase init

# 2. Link to remote project
supabase link --project-ref your-project-ref

# 3. Apply migrations
supabase db push

# 4. Verify migrations
supabase migration list
```

### Step 2: Load Knowledge Base

```typescript
import { SupabaseDeepSearch } from '@prisma-glow/agents';

const search = new SupabaseDeepSearch({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
});

// Insert documents
await search.insertDocuments([
  {
    content: 'Corporate tax in Rwanda is 30%...',
    metadata: {
      source: 'RRA Corporate Tax Guide 2024',
      category: 'TAX',
      jurisdiction: 'RW',
      tags: ['corporate-tax', 'rwanda'],
    },
  },
  // ... more documents
]);

// Verify
const stats = await search.getDocumentStats();
console.log('Documents loaded:', stats);
```

### Step 3: Deploy Application

#### Option A: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add OPENAI_API_KEY
vercel env add GEMINI_API_KEY
```

#### Option B: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Set environment variables
railway variables set SUPABASE_URL=...
railway variables set OPENAI_API_KEY=...
```

#### Option C: Docker

```bash
# Build image
docker build -t agent-system:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  agent-system:latest
```

### Step 4: Verify Deployment

```bash
# Run health checks
curl https://your-app.vercel.app/api/health

# Test agent endpoint
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "tax-corp-rw-027",
    "message": "What are the tax rates?"
  }'
```

## 🔧 Configuration

### Supabase RLS Policies

Ensure RLS policies are enabled:

```sql
-- Enable RLS
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Verify policies
SELECT * FROM pg_policies WHERE tablename IN ('kb_documents', 'conversations', 'conversation_messages');
```

### Vector Index Optimization

```sql
-- For production, tune the IVFFlat index
ALTER INDEX kb_documents_embedding_idx 
  SET (lists = 1000); -- Adjust based on document count

-- Rebuild index
REINDEX INDEX kb_documents_embedding_idx;
```

### Rate Limiting

Add rate limiting to API endpoints:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/chat', limiter);
```

## 📊 Monitoring

### 1. Supabase Metrics

Monitor in Supabase Dashboard:
- Database usage
- API requests
- Storage usage
- Active connections

### 2. Application Metrics

```typescript
// Track agent usage
await supabase.from('agent_usage').insert({
  agent_id: agentId,
  user_id: userId,
  response_time: duration,
  tokens_used: tokens,
});

// Monitor errors
await supabase.from('error_logs').insert({
  agent_id: agentId,
  error_message: error.message,
  stack_trace: error.stack,
});
```

### 3. Cost Monitoring

Track API costs:

```typescript
// OpenAI
const cost = (promptTokens * 0.01 + completionTokens * 0.03) / 1000;

// Gemini
const geminiCost = (inputTokens * 0.00125 + outputTokens * 0.005) / 1000;

// Log costs
await supabase.from('api_costs').insert({
  provider: 'openai',
  model: 'gpt-4o-mini',
  cost,
  timestamp: new Date(),
});
```

## 🔒 Security

### 1. API Keys

- Store in environment variables
- Never commit to git
- Rotate regularly
- Use different keys for dev/staging/prod

### 2. Supabase Security

```sql
-- Ensure service role key is not exposed
-- Use anon key for client-side
-- Enable RLS on all tables
-- Audit policies regularly
```

### 3. Input Validation

```typescript
// Validate user input
const sanitizedMessage = message
  .trim()
  .substring(0, 4000) // Limit length
  .replace(/<script>/gi, ''); // Remove scripts

// Validate agent ID
const validAgentIds = registry.getAllAgents().map(a => a.id);
if (!validAgentIds.includes(agentId)) {
  throw new Error('Invalid agent ID');
}
```

## 📈 Scaling

### Database Scaling

1. **Connection Pooling**:
```typescript
const supabase = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'public' },
  global: { headers: { 'x-my-custom-header': 'value' } },
});
```

2. **Read Replicas** (Supabase Pro):
- Use read replicas for searches
- Write to primary database

3. **Caching**:
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Cache search results
const cacheKey = `search:${agentId}:${hash(query)}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;

const results = await search(query);
await redis.setex(cacheKey, 3600, results); // 1 hour
```

### Application Scaling

- Use serverless functions (Vercel/Railway)
- Enable CDN for static assets
- Implement queue for long-running tasks
- Use edge functions for low-latency

## 🧪 Testing in Production

```bash
# Smoke tests
pnpm run test:smoke

# Load tests
pnpm run test:load

# E2E tests
pnpm run test:e2e
```

## 📝 Post-Deployment

### 1. Monitor Logs

```bash
# Vercel
vercel logs

# Railway
railway logs

# Supabase
# Check logs in dashboard
```

### 2. User Feedback

- Add feedback collection
- Monitor error rates
- Track user satisfaction
- Iterate based on feedback

### 3. Performance Optimization

- Monitor response times
- Optimize slow queries
- Tune vector index
- Adjust model parameters

## 🎯 Success Metrics

Track these KPIs:

- **Availability**: > 99.9% uptime
- **Response Time**: < 3s avg
- **Error Rate**: < 0.1%
- **Cost per Request**: Track and optimize
- **User Satisfaction**: > 4.5/5

## 📞 Support

### Issues

- Check logs first
- Review Supabase status
- Test with curl/Postman
- Open GitHub issue if needed

### Rollback Plan

```bash
# Revert to previous deployment
vercel rollback

# Or revert migration
supabase db reset --linked

# Or restore from backup
# (Configure automatic backups in Supabase)
```

---

**Status**: ✅ Ready for Production  
**Last Updated**: December 1, 2024  
**Next Review**: After first 1000 users
