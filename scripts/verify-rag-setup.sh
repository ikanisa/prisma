#!/bin/bash
# RAG Ingestion Pipeline Setup Verification

set -e

echo "🔍 RAG Ingestion Pipeline - Setup Verification"
echo "=============================================="
echo ""

# Check files exist
echo "✅ Checking files..."
files=(
  "supabase/migrations/20260201160000_rag_ingestion_pipeline.sql"
  "scripts/ingestKnowledgeFromWeb.ts"
  ".github/workflows/rag-ingestion.yml"
  "RAG_INGESTION_PIPELINE_README.md"
  "RAG_INGESTION_PIPELINE_SUMMARY.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
    exit 1
  fi
done

echo ""
echo "✅ Checking dependencies..."
deps=("@supabase/supabase-js" "openai" "jsdom" "pdf-parse" "js-sha256")
missing=()

for dep in "${deps[@]}"; do
  if grep -q "\"$dep\"" package.json; then
    echo "  ✓ $dep (in package.json)"
  else
    echo "  ✗ $dep (NOT in package.json)"
    missing+=("$dep")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  Missing dependencies. Run: pnpm install"
  exit 1
fi

echo ""
echo "✅ Checking environment variables..."
required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "OPENAI_API_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "  ✗ $var (not set)"
    missing_vars+=("$var")
  else
    echo "  ✓ $var (set)"
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  Missing environment variables. Set before running ingestion:"
  for var in "${missing_vars[@]}"; do
    echo "    export $var=..."
  done
  echo ""
fi

echo ""
echo "✅ Checking package.json scripts..."
if grep -q "\"ingest:web\"" package.json; then
  echo "  ✓ ingest:web script defined"
else
  echo "  ✗ ingest:web script NOT defined"
  exit 1
fi

echo ""
echo "=============================================="
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Apply migration: psql \"\$DATABASE_URL\" -f supabase/migrations/20260201160000_rag_ingestion_pipeline.sql"
echo "  2. Install deps: pnpm install --frozen-lockfile"
echo "  3. Run ingestion: pnpm run ingest:web"
echo ""
