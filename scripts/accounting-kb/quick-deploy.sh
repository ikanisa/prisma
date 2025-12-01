#!/usr/bin/env bash
# Quick Deploy - Accounting Knowledge Base
# Run this after setting environment variables

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Accounting KB - Quick Deploy                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Error: SUPABASE_URL not set"
  echo "   export SUPABASE_URL='https://your-project.supabase.co'"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"
  echo "   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY not set"
  echo "   export OPENAI_API_KEY='sk-...'"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  Warning: DATABASE_URL not set"
  echo "   If using Supabase CLI, this is okay"
  echo "   Otherwise, set: export DATABASE_URL='postgresql://...'"
  echo ""
fi

echo "✅ Environment variables configured"
echo ""

# Validate files
echo "📋 Validating files..."
bash scripts/accounting-kb/validate.sh
echo ""

# Check dependencies
echo "📦 Checking dependencies..."
if ! npm list pdf-parse @supabase/supabase-js openai > /dev/null 2>&1; then
  echo "⚠️  Dependencies not installed"
  echo "   Installing: pnpm add pdf-parse @supabase/supabase-js openai"
  pnpm add pdf-parse @supabase/supabase-js openai
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed"
fi
echo ""

# Deploy schema
echo "🗄️  Deploying database schema..."
if command -v supabase > /dev/null 2>&1; then
  echo "   Using Supabase CLI..."
  supabase db push
  echo "✅ Schema deployed via Supabase CLI"
elif [ -n "$DATABASE_URL" ]; then
  echo "   Using psql..."
  psql "$DATABASE_URL" -f supabase/migrations/20251201210000_accounting_kb.sql
  echo "✅ Schema deployed via psql"
else
  echo "❌ Error: No deployment method available"
  echo "   Either install Supabase CLI or set DATABASE_URL"
  exit 1
fi
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE                              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Run ingestion: node scripts/accounting-kb/ingest.ts"
echo "  2. Verify data: psql \$DATABASE_URL -c 'SELECT * FROM jurisdictions;'"
echo "  3. Test search: Query the knowledge base via your agent platform"
echo ""
