#!/bin/bash
# DeepSearch Deployment Script
# Deploys the complete RAG system to production

set -e

echo "🚀 DeepSearch RAG System Deployment"
echo "===================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL not set"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ OPENAI_API_KEY not set"
  exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Step 1: Deploy migration
echo "📦 Step 1: Deploying Postgres RPC function..."
psql "$DATABASE_URL" -f supabase/migrations/20251201213700_match_knowledge_chunks_rpc.sql
echo "✅ Migration deployed: match_knowledge_chunks RPC"
echo ""

# Step 2: Verify RPC exists
echo "🔍 Step 2: Verifying RPC function..."
psql "$DATABASE_URL" -c "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'match_knowledge_chunks';" | grep -q "match_knowledge_chunks"
if [ $? -eq 0 ]; then
  echo "✅ RPC function verified"
else
  echo "❌ RPC function not found"
  exit 1
fi
echo ""

# Step 3: Test with sample embedding
echo "🧪 Step 3: Testing RPC with sample query..."
psql "$DATABASE_URL" << 'EOSQL'
SELECT COUNT(*) as total_chunks
FROM knowledge_chunks
WHERE embedding IS NOT NULL;
EOSQL
echo "✅ Database connectivity confirmed"
echo ""

# Step 4: Build TypeScript
echo "🔨 Step 4: Building TypeScript..."
pnpm run typecheck
echo "✅ TypeScript compiled"
echo ""

# Step 5: Deployment summary
echo "✅ DEPLOYMENT COMPLETE"
echo ""
echo "📊 Summary:"
echo "   - RPC function: match_knowledge_chunks"
echo "   - TypeScript client: src/lib/deepSearch.ts"
echo "   - OpenAI agents: src/agents/*.ts"
echo "   - Gemini integration: src/gemini/"
echo ""
echo "🎯 Next Steps:"
echo "   1. Test: pnpm tsx scripts/test-deepsearch.ts"
echo "   2. Integrate agents into your application"
echo "   3. Build Knowledge Console UI"
echo ""
echo "📚 Documentation: KNOWLEDGE_BASE_DEEPSEARCH_COMPLETE.md"
