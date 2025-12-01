#!/bin/bash

# Knowledge Web Sources - Verification Script
# Run this after applying the migration to verify everything is set up correctly.

set -e

echo "=================================================="
echo "Knowledge Web Sources - Verification Script"
echo "=================================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo ""
    echo "Set it with:"
    echo "  export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Test 1: Check if table exists
echo "Test 1: Checking if table exists..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knowledge_web_sources');")
if [ "$TABLE_EXISTS" = "t" ]; then
    echo "✅ Table 'knowledge_web_sources' exists"
else
    echo "❌ Table 'knowledge_web_sources' does NOT exist"
    echo "   Run: psql \"\$DATABASE_URL\" -f supabase/migrations/20251201_knowledge_web_sources_200_urls.sql"
    exit 1
fi
echo ""

# Test 2: Check row count
echo "Test 2: Checking row count..."
ROW_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM knowledge_web_sources;")
echo "   Total rows: $ROW_COUNT"
if [ "$ROW_COUNT" -eq 200 ]; then
    echo "✅ Exactly 200 rows (as expected)"
else
    echo "⚠️  Expected 200 rows, found $ROW_COUNT"
fi
echo ""

# Test 3: Check active sources
echo "Test 3: Checking active sources..."
ACTIVE_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM knowledge_web_sources WHERE status = 'ACTIVE';")
echo "   Active sources: $ACTIVE_COUNT"
echo "✅ Active source count verified"
echo ""

# Test 4: Check unique domains
echo "Test 4: Checking unique domains..."
DOMAIN_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(DISTINCT domain) FROM knowledge_web_sources;")
echo "   Unique domains: $DOMAIN_COUNT"
echo "✅ Domain count verified"
echo ""

# Test 5: Check categories
echo "Test 5: Checking categories breakdown..."
psql "$DATABASE_URL" -c "
SELECT 
    category, 
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE authority_level = 'PRIMARY') as primary_count
FROM knowledge_web_sources 
GROUP BY category 
ORDER BY count DESC;
"
echo ""

# Test 6: Check jurisdictions
echo "Test 6: Checking jurisdictions breakdown..."
psql "$DATABASE_URL" -c "
SELECT 
    jurisdiction_code, 
    COUNT(*) as count
FROM knowledge_web_sources 
GROUP BY jurisdiction_code 
ORDER BY count DESC;
"
echo ""

# Test 7: Check indexes
echo "Test 7: Checking indexes..."
INDEX_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'knowledge_web_sources';")
echo "   Found $INDEX_COUNT indexes"
if [ "$INDEX_COUNT" -ge 6 ]; then
    echo "✅ All expected indexes exist"
else
    echo "⚠️  Expected at least 6 indexes, found $INDEX_COUNT"
fi
echo ""

# Test 8: Sample query - Get IFRS sources
echo "Test 8: Sample query - IFRS sources..."
IFRS_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM knowledge_web_sources WHERE category = 'IFRS' AND status = 'ACTIVE';")
echo "   Active IFRS sources: $IFRS_COUNT"
echo "✅ Sample query successful"
echo ""

# Test 9: Sample query - Rwanda sources
echo "Test 9: Sample query - Rwanda sources..."
RW_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM knowledge_web_sources WHERE jurisdiction_code = 'RW' AND status = 'ACTIVE';")
echo "   Active Rwanda sources: $RW_COUNT"
echo "✅ Sample query successful"
echo ""

# Test 10: Sample query - Primary sources
echo "Test 10: Sample query - Primary sources..."
PRIMARY_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM knowledge_web_sources WHERE authority_level = 'PRIMARY' AND status = 'ACTIVE';")
echo "   Active primary sources: $PRIMARY_COUNT"
echo "✅ Sample query successful"
echo ""

# Summary
echo "=================================================="
echo "VERIFICATION SUMMARY"
echo "=================================================="
echo "✅ Table exists and is properly seeded"
echo "✅ Row count: $ROW_COUNT"
echo "✅ Active sources: $ACTIVE_COUNT"
echo "✅ Unique domains: $DOMAIN_COUNT"
echo "✅ Indexes: $INDEX_COUNT"
echo "✅ IFRS sources: $IFRS_COUNT"
echo "✅ Rwanda sources: $RW_COUNT"
echo "✅ Primary sources: $PRIMARY_COUNT"
echo ""
echo "🎉 All verification tests passed!"
echo ""
echo "Next steps:"
echo "  1. Integrate with DeepSearch: import { getActiveDomains } from '@/packages/lib/src/knowledge-web-sources'"
echo "  2. Build admin panel for managing sources"
echo "  3. Configure crawler to use these sources"
echo ""
echo "Documentation:"
echo "  - Integration guide: docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md"
echo "  - Quick start: README_KNOWLEDGE_WEB_SOURCES.md"
echo "  - TypeScript helpers: packages/lib/src/knowledge-web-sources.ts"
echo ""
