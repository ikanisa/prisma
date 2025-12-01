#!/bin/bash

# Knowledge Base Deployment Script
# Deploys the accounting knowledge base system

set -e

echo "🚀 Deploying Accounting Knowledge Base"
echo "======================================="
echo ""

# Check required environment variables
required_vars=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "OPENAI_API_KEY"
  "DATABASE_URL"
)

echo "✓ Checking environment variables..."
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set"
    exit 1
  fi
done
echo "✓ All environment variables set"
echo ""

# Check dependencies
echo "✓ Checking dependencies..."
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Install with: npm install -g pnpm"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ psql not found. Install PostgreSQL client"; exit 1; }
echo "✓ Dependencies found"
echo ""

# Install Node dependencies
echo "📦 Installing Node dependencies..."
cd "$(dirname "$0")"
pnpm install --frozen-lockfile
echo "✓ Node dependencies installed"
echo ""

# Apply database migration
echo "🗄️  Applying database migration..."
psql "$DATABASE_URL" -f ../../supabase/migrations/20251201170000_accounting_knowledge_base.sql
echo "✓ Database migration applied"
echo ""

# Run ingestion (optional - comment out if you want to do this manually)
read -p "Would you like to ingest knowledge sources now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📥 Ingesting knowledge sources..."
  pnpm tsx ingest.ts
  echo "✓ Knowledge ingestion complete"
  echo ""
fi

# Test the system
echo "🧪 Testing the system..."
pnpm tsx test-search.ts --stats
echo ""

# Show quick commands
echo "✅ Deployment Complete!"
echo ""
echo "Quick commands:"
echo "  pnpm tsx test-search.ts 'Your question'  - Search the knowledge base"
echo "  pnpm tsx manage.ts list-sources           - List all sources"
echo "  pnpm tsx manage.ts stats                  - Show statistics"
echo "  pnpm tsx examples.ts                      - Run examples"
echo ""
echo "Or use the Makefile:"
echo "  make kb-test        - Test search"
echo "  make kb-list        - List sources"
echo "  make kb-stats       - Show stats"
echo "  make kb-examples    - Run examples"
echo ""
echo "Documentation:"
echo "  config/knowledge/QUICK_START.md"
echo "  scripts/knowledge/README.md"
echo "  scripts/knowledge/INTEGRATION_GUIDE.md"
echo ""
echo "🎉 System is ready to use!"
