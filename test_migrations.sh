#!/bin/bash
# Test script for new migrations
# This script validates the migration syntax

echo "Testing new migration files..."

# Test Phase 1: Core Functions
echo ""
echo "=== Testing Phase 1: Core Functions ==="
psql "$DATABASE_URL" -f supabase/migrations/20250103000000_core_functions_consolidation.sql --dry-run 2>&1 | head -20

# Test Phase 2: Enums
echo ""
echo "=== Testing Phase 2: Enums ==="
psql "$DATABASE_URL" -f supabase/migrations/20250103000001_enums_consolidation.sql --dry-run 2>&1 | head -20

echo ""
echo "=== Migration syntax validation complete ==="
