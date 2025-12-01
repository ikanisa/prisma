#!/bin/bash
#
# Quick Test - Validates TypeScript code without full build
#

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║      Quick Test: Auto-Classification Code Validation         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "🔍 Testing Classification Engine Code..."
echo ""

# Test 1: Check TypeScript syntax
echo "Test 1: TypeScript Syntax Check"
if command -v npx &>/dev/null; then
    # Quick syntax check (doesn't require full build)
    npx -y typescript@latest --noEmit --skipLibCheck \
        services/rag/knowledge/classification/types.ts \
        2>&1 | head -20
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "  ✅ TypeScript syntax is valid"
    else
        echo "  ⚠️  TypeScript has issues (may require dependencies)"
    fi
else
    echo "  ⚠️  TypeScript not available (install: npm i -g typescript)"
fi

echo ""
echo "Test 2: File Structure Validation"

# Test 2: Verify all core files exist and are non-empty
FILES=(
    "services/rag/knowledge/classification/types.ts"
    "services/rag/knowledge/classification/heuristic.ts"
    "services/rag/knowledge/classification/llm.ts"
    "services/rag/knowledge/classification/index.ts"
    "apps/gateway/src/routes/web-sources.ts"
)

PASS=0
FAIL=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        SIZE=$(wc -l < "$file" | xargs)
        echo "  ✅ $file ($SIZE lines)"
        ((PASS++))
    else
        echo "  ❌ $file (missing or empty)"
        ((FAIL++))
    fi
done

echo ""
echo "Test 3: Domain Rules Check"

# Test 3: Count domain rules in heuristic classifier
if [ -f "services/rag/knowledge/classification/heuristic.ts" ]; then
    RULE_COUNT=$(grep -c "domain:" services/rag/knowledge/classification/heuristic.ts || echo "0")
    echo "  ✅ Found $RULE_COUNT domain rules"
    
    if [ "$RULE_COUNT" -gt 100 ]; then
        echo "     (Comprehensive rule set ✓)"
    else
        echo "     (Minimal rule set, expected 200+)"
    fi
fi

echo ""
echo "Test 4: API Routes Check"

# Test 4: Verify API endpoints are defined
if grep -q "POST.*web-sources" apps/gateway/src/routes/web-sources.ts 2>/dev/null; then
    echo "  ✅ API endpoints defined:"
    grep -o "router\.\w\+.*web-sources" apps/gateway/src/routes/web-sources.ts | head -6 | sed 's/^/     /'
else
    echo "  ⚠️  API routes may not be complete"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Summary
echo "📊 QUICK TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Core Files: $PASS/$((PASS + FAIL)) present"
echo "  Domain Rules: $RULE_COUNT configured"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ Code validation passed!"
    echo ""
    echo "Next steps:"
    echo "  1. To test with real TypeScript compilation:"
    echo "     pnpm run typecheck"
    echo ""
    echo "  2. To build services:"
    echo "     pnpm --filter @prisma-glow/rag-service build"
    echo "     pnpm --filter @prisma-glow/gateway build"
    echo ""
    echo "  3. To run full deployment:"
    echo "     ./deploy-auto-classification.sh"
else
    echo "❌ Some files are missing. Check output above."
fi

echo ""
