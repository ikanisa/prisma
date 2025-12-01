#!/usr/bin/env bash
# Accounting Knowledge Base - Validation Script
# Verifies all components are in place

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Accounting Knowledge Base - Validation Check       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

ERRORS=0

check_file() {
  local file=$1
  local desc=$2
  
  if [ -f "$file" ]; then
    echo "✅ $desc"
    echo "   → $file"
  else
    echo "❌ $desc - NOT FOUND"
    echo "   → $file"
    ERRORS=$((ERRORS + 1))
  fi
}

check_dir() {
  local dir=$1
  local desc=$2
  
  if [ -d "$dir" ]; then
    echo "✅ $desc"
    echo "   → $dir/"
  else
    echo "❌ $desc - NOT FOUND"
    echo "   → $dir/"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "📋 Checking Database Schema..."
check_file "supabase/migrations/20251201210000_accounting_kb.sql" "Migration file"
echo ""

echo "📋 Checking Configuration Files..."
check_file "config/agents/deepsearch.yaml" "DeepSearch agent definition"
check_file "config/agents/accountant-ai.yaml" "AccountantAI persona"
check_file "config/retrieval-rules.yaml" "Retrieval rules"
check_file "config/accounting-kb-pipeline.yaml" "Pipeline workflow"
echo ""

echo "📋 Checking Scripts..."
check_file "scripts/accounting-kb/ingest.ts" "TypeScript ingestion script"
echo ""

echo "📋 Checking Documentation..."
check_file "docs/accounting-kb/README.md" "Usage documentation"
check_file "ACCOUNTING_KB_READY_TO_USE.md" "Quick start guide"
echo ""

echo "📋 Checking Migration Content..."
if grep -q "create extension if not exists vector" supabase/migrations/20251201210000_accounting_kb.sql 2>/dev/null; then
  echo "✅ pgvector extension enabled"
else
  echo "❌ pgvector extension not found in migration"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "create table if not exists knowledge_embeddings" supabase/migrations/20251201210000_accounting_kb.sql 2>/dev/null; then
  echo "✅ knowledge_embeddings table defined"
else
  echo "❌ knowledge_embeddings table not found"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "vector(1536)" supabase/migrations/20251201210000_accounting_kb.sql 2>/dev/null; then
  echo "✅ Vector dimension (1536) configured"
else
  echo "❌ Vector dimension not configured"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "ivfflat" supabase/migrations/20251201210000_accounting_kb.sql 2>/dev/null; then
  echo "✅ Vector index (ivfflat) defined"
else
  echo "❌ Vector index not found"
  ERRORS=$((ERRORS + 1))
fi

echo ""

echo "📋 Checking Ingestion Script..."
if grep -q "text-embedding-3-large" scripts/accounting-kb/ingest.ts 2>/dev/null; then
  echo "✅ Embedding model configured"
else
  echo "❌ Embedding model not configured"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "createClient" scripts/accounting-kb/ingest.ts 2>/dev/null; then
  echo "✅ Supabase client import"
else
  echo "❌ Supabase client not imported"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "pdfParse" scripts/accounting-kb/ingest.ts 2>/dev/null; then
  echo "✅ PDF parser import"
else
  echo "❌ PDF parser not imported"
  ERRORS=$((ERRORS + 1))
fi

echo ""

echo "📋 Checking Agent Definitions..."
if grep -q "supabase_semantic_search" config/agents/deepsearch.yaml 2>/dev/null; then
  echo "✅ DeepSearch semantic search tool"
else
  echo "❌ Semantic search tool not defined"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "AccountantAI" config/agents/accountant-ai.yaml 2>/dev/null; then
  echo "✅ AccountantAI agent name"
else
  echo "❌ AccountantAI name not found"
  ERRORS=$((ERRORS + 1))
fi

echo ""

echo "📋 Summary..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed! System is ready to deploy."
  echo ""
  echo "Next steps:"
  echo "  1. Apply migration: psql \$DATABASE_URL -f supabase/migrations/20251201210000_accounting_kb.sql"
  echo "  2. Set environment: export SUPABASE_URL=... OPENAI_API_KEY=..."
  echo "  3. Install deps: pnpm add pdf-parse @supabase/supabase-js openai"
  echo "  4. Run ingestion: node scripts/accounting-kb/ingest.ts"
  echo ""
  exit 0
else
  echo "❌ $ERRORS errors found. Please review the issues above."
  echo ""
  exit 1
fi
