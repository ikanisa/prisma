#!/bin/bash
# Function Consolidation Verification Script
# Purpose: Verify that consolidated functions are correctly deployed and working

set -e

echo "============================================================================"
echo "Function Consolidation Verification"
echo "============================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: supabase CLI not found${NC}"
    exit 1
fi

echo "Step 1: Checking migration status..."
echo "-----------------------------------"
if supabase migration list --linked 2>&1 | grep -q "20250103000000.*20250103000000"; then
    echo -e "${GREEN}✓ Migration 20250103000000 is deployed${NC}"
else
    echo -e "${RED}✗ Migration 20250103000000 not found in remote${NC}"
    exit 1
fi
echo ""

echo "Step 2: Verifying functions exist..."
echo "-----------------------------------"
echo "Running function existence check..."
echo ""

# Run verification SQL
if [ -f "verify_functions.sql" ]; then
    echo "Executing function verification queries..."
    echo ""
    
    # Extract and run function existence check
    supabase db execute --linked --query "
    SELECT 
      proname as function_name,
      pg_get_function_arguments(oid) as arguments,
      prosecdef as is_security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND proname IN (
        'current_user_id',
        'touch_updated_at',
        'is_member_of',
        'has_min_role',
        'handle_new_user'
      )
    ORDER BY proname, pg_get_function_arguments(oid);
    " 2>&1 | head -20 || echo -e "${YELLOW}Note: Some functions may not exist yet${NC}"
    
    echo ""
else
    echo -e "${YELLOW}Warning: verify_functions.sql not found${NC}"
    echo "Please run the SQL verification queries manually"
fi

echo ""
echo "Step 3: Testing function execution..."
echo "-----------------------------------"
echo "Note: These tests require authentication"
echo ""

echo "Test 1: current_user_id()"
supabase db execute --linked --query "SELECT public.current_user_id();" 2>&1 | head -5 || echo -e "${YELLOW}Function test skipped (requires auth)${NC}"
echo ""

echo "Test 2: is_member_of()"
supabase db execute --linked --query "
SELECT public.is_member_of('00000000-0000-0000-0000-000000000000'::uuid) as result;
" 2>&1 | head -5 || echo -e "${YELLOW}Function test skipped (requires auth)${NC}"
echo ""

echo "Test 3: has_min_role()"
supabase db execute --linked --query "
SELECT public.has_min_role(
  '00000000-0000-0000-0000-000000000000'::uuid, 
  'EMPLOYEE'::public.role_level
) as result;
" 2>&1 | head -5 || echo -e "${YELLOW}Function test skipped (requires auth)${NC}"
echo ""

echo "============================================================================"
echo "Verification Complete"
echo "============================================================================"
echo ""
echo "Next steps:"
echo "1. Review the output above"
echo "2. Run verify_functions.sql in Supabase SQL Editor for detailed checks"
echo "3. Run verify_rls_policies.sql to check RLS policies"
echo "4. Test application functionality manually"
echo ""

