#!/bin/bash
#
# Web Source Auto-Classification - Quick Deployment Script
# Run this to deploy the auto-classification system in one command
#

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Web Source Auto-Classification - Deployment Script        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found${NC}"
    echo "   Install: npm install -g pnpm@9.12.3"
    exit 1
fi
PNPM_VERSION=$(pnpm --version)
echo -e "${GREEN}✓${NC} pnpm: $PNPM_VERSION"

# Check database URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠${NC}  DATABASE_URL not set (migration will be skipped)"
    SKIP_MIGRATION=true
else
    echo -e "${GREEN}✓${NC} DATABASE_URL is set"
    SKIP_MIGRATION=false
fi

# Check OpenAI API key (optional)
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠${NC}  OPENAI_API_KEY not set (LLM classification disabled, heuristic only)"
else
    echo -e "${GREEN}✓${NC} OPENAI_API_KEY is set"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Apply Database Migration
if [ "$SKIP_MIGRATION" = false ]; then
    echo "📊 Step 1: Applying database migration..."
    echo ""
    
    MIGRATION_FILE="supabase/migrations/20260201120000_auto_classification_columns.sql"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
        exit 1
    fi
    
    echo "   Applying: $MIGRATION_FILE"
    
    if command -v psql &> /dev/null; then
        psql "$DATABASE_URL" -f "$MIGRATION_FILE"
        echo -e "${GREEN}✓${NC} Migration applied successfully"
    else
        echo -e "${YELLOW}⚠${NC}  psql not found. Please apply migration manually:"
        echo "   psql \"\$DATABASE_URL\" -f $MIGRATION_FILE"
    fi
else
    echo "⏭️  Step 1: Skipping database migration (DATABASE_URL not set)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Install Dependencies
echo "📦 Step 2: Installing dependencies..."
echo ""

pnpm install --frozen-lockfile
echo -e "${GREEN}✓${NC} Dependencies installed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Build RAG Service
echo "🔨 Step 3: Building RAG service..."
echo ""

pnpm --filter @prisma-glow/rag-service build
echo -e "${GREEN}✓${NC} RAG service built"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 4: Build Gateway
echo "🔨 Step 4: Building gateway..."
echo ""

pnpm --filter @prisma-glow/gateway build
echo -e "${GREEN}✓${NC} Gateway built"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 5: Verify Installation
echo "✅ Step 5: Verifying installation..."
echo ""

# Check if classification files exist
if [ -f "services/rag/knowledge/classification/index.ts" ]; then
    echo -e "${GREEN}✓${NC} Classification engine: installed"
else
    echo -e "${RED}❌ Classification engine: missing${NC}"
    exit 1
fi

if [ -f "apps/gateway/src/routes/web-sources.ts" ]; then
    echo -e "${GREEN}✓${NC} API routes: installed"
else
    echo -e "${RED}❌ API routes: missing${NC}"
    exit 1
fi

if [ -f "scripts/classify-existing-sources.ts" ]; then
    echo -e "${GREEN}✓${NC} Utility scripts: installed"
else
    echo -e "${RED}❌ Utility scripts: missing${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Success Summary
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   ✅ DEPLOYMENT COMPLETE                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Start the gateway:"
echo "   $ pnpm --filter @prisma-glow/gateway dev"
echo ""
echo "2. Test the API:"
echo "   $ curl -X POST http://localhost:3001/api/v1/web-sources \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"name\":\"IFRS\",\"base_url\":\"https://ifrs.org\"}'"
echo ""
echo "3. (Optional) Classify existing sources:"
echo "   $ pnpm tsx scripts/classify-existing-sources.ts --dry-run"
echo ""
echo "4. (Optional) Generate classification report:"
echo "   $ pnpm tsx scripts/generate-classification-report.ts"
echo ""
echo "📖 Documentation:"
echo "   → START_HERE_AUTO_CLASSIFICATION.md"
echo "   → WEB_SOURCE_AUTO_CLASSIFICATION_QUICK_START.md"
echo ""
echo "✨ Web Source Auto-Classification System is ready!"
echo ""
