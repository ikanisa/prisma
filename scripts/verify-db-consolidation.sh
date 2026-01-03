#!/bin/bash
# ============================================
# Database Consolidation Verification Script
# ============================================
# Run this script before and after migrations to verify data integrity.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Database Consolidation Verification"
echo "=========================================="

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: supabase CLI not found${NC}"
    exit 1
fi

# Function to run SQL and get result
run_sql() {
    supabase db reset --db-only 2>/dev/null || true
    supabase db query "$1" 2>/dev/null || psql "$DATABASE_URL" -c "$1" 2>/dev/null
}

echo ""
echo "📊 CURRENT TABLE COUNT"
echo "----------------------------------------"
cat << 'EOF' | psql "$DATABASE_URL" -t
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
EOF

echo ""
echo "📋 TABLES BY PREFIX"
echo "----------------------------------------"
cat << 'EOF' | psql "$DATABASE_URL" -t
SELECT 
    CASE 
        WHEN table_name LIKE 'agent%' THEN 'agent_*'
        WHEN table_name LIKE 'kb%' THEN 'kb_*'
        WHEN table_name LIKE 'knowledge%' THEN 'knowledge_*'
        WHEN table_name LIKE 'learning%' THEN 'learning_*'
        WHEN table_name LIKE 'chat%' THEN 'chat_*'
        WHEN table_name LIKE 'audit%' THEN 'audit_*'
        WHEN table_name LIKE 'tax%' THEN 'tax_*'
        ELSE 'other'
    END as prefix,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
GROUP BY 1
ORDER BY 2 DESC;
EOF

echo ""
echo "🔢 ROW COUNTS FOR KEY TABLES"
echo "----------------------------------------"
cat << 'EOF' | psql "$DATABASE_URL" -t
SELECT 'conversations' as table_name, COUNT(*) as rows FROM conversations
UNION ALL SELECT 'conversation_messages', COUNT(*) FROM conversation_messages
UNION ALL SELECT 'agents', COUNT(*) FROM agents
UNION ALL SELECT 'agent_executions', COUNT(*) FROM agent_executions
UNION ALL SELECT 'agent_reasoning_traces', COUNT(*) FROM agent_reasoning_traces
UNION ALL SELECT 'curated_knowledge_base', COUNT(*) FROM curated_knowledge_base
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
ORDER BY 1;
EOF

echo ""
echo "⚙️ FUNCTION COUNT"
echo "----------------------------------------"
cat << 'EOF' | psql "$DATABASE_URL" -t
SELECT COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'app');
EOF

echo ""
echo "🔍 DUPLICATE TABLE CHECK"
echo "----------------------------------------"
echo "Tables that might be duplicates:"
cat << 'EOF' | psql "$DATABASE_URL" -t
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND (
    table_name IN (
        'agent_trace', 'agent_traces', 'agent_runs',
        'chat_sessions', 'chat_messages',
        'kb_sources', 'knowledge_sources',
        'learning_examples'
    )
);
EOF

echo ""
echo -e "${GREEN}✅ Verification complete${NC}"
echo "=========================================="
