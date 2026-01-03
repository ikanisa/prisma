#!/bin/bash
# RAG Pipeline Deployment & Testing Script
# This script guides you through deploying and validating the RAG ingestion pipeline

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       RAG Ingestion Pipeline - Deployment & Testing           ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo ""

# ============================================================================
# Step 1: Verify Prerequisites
# ============================================================================

echo -e "${YELLOW}[Step 1/7] Verifying prerequisites...${NC}"

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: Must run from repository root${NC}"
    exit 1
fi

# Check for required commands
for cmd in psql pnpm node; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}✗ Error: $cmd is not installed${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# ============================================================================
# Step 2: Check Environment Variables
# ============================================================================

echo -e "${YELLOW}[Step 2/7] Checking environment variables...${NC}"

missing_vars=()

if [ -z "$SUPABASE_URL" ]; then
    missing_vars+=("SUPABASE_URL")
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
fi

if [ -z "$OPENAI_API_KEY" ]; then
    missing_vars+=("OPENAI_API_KEY")
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set (optional, but recommended for testing)${NC}"
fi

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}✗ Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "${RED}  - $var${NC}"
    done
    echo ""
    echo -e "${YELLOW}Set them with:${NC}"
    echo "  export SUPABASE_URL=https://your-project.supabase.co"
    echo "  export SUPABASE_SERVICE_ROLE_KEY=eyJhbGc..."
    echo "  export OPENAI_API_KEY=sk-..."
    echo ""
    echo -e "${YELLOW}Or create .env.local file:${NC}"
    echo "  cat > .env.local << EOF"
    echo "  SUPABASE_URL=https://your-project.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc..."
    echo "  OPENAI_API_KEY=sk-..."
    echo "  EOF"
    echo ""
    read -p "Do you want to set them now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "SUPABASE_URL: " SUPABASE_URL
        export SUPABASE_URL
        read -p "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
        export SUPABASE_SERVICE_ROLE_KEY
        read -p "OPENAI_API_KEY: " OPENAI_API_KEY
        export OPENAI_API_KEY
        read -p "DATABASE_URL (optional): " DATABASE_URL
        export DATABASE_URL
    else
        echo -e "${RED}✗ Cannot proceed without environment variables${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# ============================================================================
# Step 3: Install Dependencies
# ============================================================================

echo -e "${YELLOW}[Step 3/7] Installing dependencies...${NC}"

if [ ! -d "node_modules/openai" ] || [ ! -d "node_modules/jsdom" ]; then
    echo "Installing packages (this may take 2-3 minutes)..."
    pnpm install --frozen-lockfile || pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# ============================================================================
# Step 4: Apply Database Migration
# ============================================================================

echo -e "${YELLOW}[Step 4/7] Applying database migration...${NC}"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set, skipping migration${NC}"
    echo "Apply manually with:"
    echo "  psql \"\$DATABASE_URL\" -f supabase/migrations/20260201160000_rag_ingestion_pipeline.sql"
else
    echo "Checking if migration already applied..."
    
    # Check if tables exist
    TABLE_CHECK=$(psql "$DATABASE_URL" -tAc "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'knowledge_web_pages'
        );
    " 2>/dev/null || echo "false")
    
    if [ "$TABLE_CHECK" = "t" ]; then
        echo -e "${GREEN}✓ Migration already applied (knowledge_web_pages exists)${NC}"
    else
        echo "Applying migration..."
        psql "$DATABASE_URL" -f supabase/migrations/20260201160000_rag_ingestion_pipeline.sql
        echo -e "${GREEN}✓ Migration applied successfully${NC}"
    fi
    
    # Verify tables created
    echo "Verifying database schema..."
    psql "$DATABASE_URL" -c "
        SELECT 'knowledge_web_pages' as table, count(*) as rows 
        FROM knowledge_web_pages
        UNION ALL
        SELECT 'knowledge_chunks' as table, count(*) as rows 
        FROM knowledge_chunks;
    "
fi
echo ""

# ============================================================================
# Step 5: Test Database Connection
# ============================================================================

echo -e "${YELLOW}[Step 5/7] Testing database connection...${NC}"

# Create a simple test script
cat > /tmp/test-supabase-connection.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testConnection() {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Test 1: Query knowledge_web_pages
        const { data: pages, error: pagesError } = await supabase
            .from('knowledge_web_pages')
            .select('count')
            .limit(1);
        
        if (pagesError) throw pagesError;
        
        console.log('✓ Successfully connected to Supabase');
        
        // Test 2: Check if knowledge_web_sources has data
        const { data: sources, error: sourcesError } = await supabase
            .from('knowledge_web_sources')
            .select('count');
        
        if (sourcesError) throw sourcesError;
        
        console.log('✓ knowledge_web_sources table accessible');
        
        process.exit(0);
    } catch (error: any) {
        console.error('✗ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF

if tsx /tmp/test-supabase-connection.ts 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

rm -f /tmp/test-supabase-connection.ts
echo ""

# ============================================================================
# Step 6: Run Test Ingestion (First 5 URLs)
# ============================================================================

echo -e "${YELLOW}[Step 6/7] Running test ingestion (first 5 URLs)...${NC}"
echo ""
echo -e "${BLUE}This will:${NC}"
echo "  1. Fetch 5 URLs from knowledge_web_sources"
echo "  2. Extract text (HTML or PDF)"
echo "  3. Chunk into ~4000 char segments"
echo "  4. Generate embeddings via OpenAI"
echo "  5. Store in knowledge_chunks table"
echo ""
echo -e "${YELLOW}Estimated time: 2-3 minutes${NC}"
echo -e "${YELLOW}Estimated cost: ~$0.01 (OpenAI embeddings)${NC}"
echo ""

read -p "Proceed with test ingestion? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping test ingestion"
else
    # Temporarily modify MAX_PAGES_PER_RUN to 5 for testing
    echo "Running test ingestion..."
    
    # Create temporary test version
    sed 's/const MAX_PAGES_PER_RUN = 25/const MAX_PAGES_PER_RUN = 5/' \
        scripts/ingestKnowledgeFromWeb.ts > /tmp/ingestKnowledgeFromWeb-test.ts
    
    # Run test ingestion
    if tsx /tmp/ingestKnowledgeFromWeb-test.ts; then
        echo ""
        echo -e "${GREEN}✓ Test ingestion completed successfully${NC}"
    else
        echo ""
        echo -e "${RED}✗ Test ingestion failed${NC}"
        rm -f /tmp/ingestKnowledgeFromWeb-test.ts
        exit 1
    fi
    
    rm -f /tmp/ingestKnowledgeFromWeb-test.ts
fi
echo ""

# ============================================================================
# Step 7: Verify Results
# ============================================================================

echo -e "${YELLOW}[Step 7/7] Verifying results...${NC}"

if [ -n "$DATABASE_URL" ]; then
    echo ""
    echo "📊 Ingestion Statistics:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    psql "$DATABASE_URL" -c "
        SELECT 
            status,
            count(*) as pages
        FROM knowledge_web_pages
        GROUP BY status
        ORDER BY count(*) DESC;
    "
    
    echo ""
    echo "📦 Chunk Statistics:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    psql "$DATABASE_URL" -c "
        SELECT 
            category,
            jurisdiction_code,
            count(*) as chunks,
            round(avg(length(content))) as avg_chunk_size
        FROM knowledge_chunks
        GROUP BY category, jurisdiction_code
        ORDER BY chunks DESC;
    "
    
    # Test semantic search
    echo ""
    echo "🔍 Testing Semantic Search:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    CHUNK_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM knowledge_chunks;")
    
    if [ "$CHUNK_COUNT" -gt 0 ]; then
        echo "Testing deep_search_knowledge() function..."
        
        psql "$DATABASE_URL" -c "
            SELECT 
                chunk_id,
                substring(content, 1, 100) || '...' as content_preview,
                category,
                jurisdiction_code,
                round(similarity::numeric, 3) as similarity
            FROM deep_search_knowledge(
                query_embedding := (SELECT embedding FROM knowledge_chunks LIMIT 1),
                p_limit := 3
            );
        "
        
        echo -e "${GREEN}✓ Semantic search working${NC}"
    else
        echo -e "${YELLOW}⚠️  No chunks found yet${NC}"
    fi
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    DEPLOYMENT COMPLETE ✅                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. 📊 Monitor ingestion:"
echo "   psql \"\$DATABASE_URL\" -c \"select * from rag_ingestion_stats;\""
echo ""
echo "2. 🔄 Run full ingestion (all 200 URLs):"
echo "   pnpm run ingest:web  # Run 8 times for all 200 URLs"
echo ""
echo "3. 🤖 Integrate into agents:"
echo "   See: RAG_INGESTION_PIPELINE_SUMMARY.md - Agent Integration"
echo ""
echo "4. ⏰ Enable GitHub Action:"
echo "   Add secrets to GitHub: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY"
echo ""
echo "5. 📚 Read documentation:"
echo "   - Quick start: RAG_INGESTION_PIPELINE_QUICKSTART.md"
echo "   - Full guide: RAG_INGESTION_PIPELINE_README.md"
echo ""
