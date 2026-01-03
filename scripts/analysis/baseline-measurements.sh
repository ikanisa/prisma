#!/bin/bash
# Baseline Measurements Script
# Purpose: Collect all system metrics before implementation
# Date: 2025-01-28

set -e

echo "🎯 PRISMA GLOW - BASELINE MEASUREMENTS"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
RESULTS_DIR="baseline-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "📊 Results will be saved to: $RESULTS_DIR"
echo ""

# 1. Code Size Analysis
echo "1️⃣  Analyzing page file sizes..."
echo "================================" | tee "$RESULTS_DIR/page-sizes.txt"
ls -lh src/pages/*.tsx 2>/dev/null | awk '{print $5, $9}' | tee -a "$RESULTS_DIR/page-sizes.txt"
echo ""
echo "Oversized pages (>15KB):" | tee -a "$RESULTS_DIR/page-sizes.txt"
ls -la src/pages/*.tsx 2>/dev/null | awk '$5 > 15000 {print $5/1024 "KB", $9}' | tee -a "$RESULTS_DIR/page-sizes.txt"
echo ""

# 2. Component Line Count
echo "2️⃣  Counting component lines..."
echo "==============================" | tee "$RESULTS_DIR/component-loc.txt"
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20 | tee -a "$RESULTS_DIR/component-loc.txt"
echo ""

# 3. Test Coverage
echo "3️⃣  Running test coverage (this may take a few minutes)..."
echo "==========================================================" | tee "$RESULTS_DIR/coverage.txt"
if pnpm run coverage 2>&1 | tee -a "$RESULTS_DIR/coverage.txt"; then
    echo -e "${GREEN}✅ Coverage analysis complete${NC}"
else
    echo -e "${YELLOW}⚠️  Coverage analysis failed or incomplete${NC}"
fi
echo ""

# 4. Agent Implementation Count
echo "4️⃣  Counting agent implementations..."
echo "====================================" | tee "$RESULTS_DIR/agents.txt"
echo "Python agent files:" | tee -a "$RESULTS_DIR/agents.txt"
find server packages -name "*agent*.py" -o -name "*tax*.py" -o -name "*audit*.py" 2>/dev/null | tee -a "$RESULTS_DIR/agents.txt"
echo "" | tee -a "$RESULTS_DIR/agents.txt"
echo "TypeScript agent files:" | tee -a "$RESULTS_DIR/agents.txt"
find src packages -name "*Agent*.tsx" -o -name "*agent*.ts" 2>/dev/null | tee -a "$RESULTS_DIR/agents.txt"
echo ""

# 5. Smart Components
echo "5️⃣  Counting Smart components..."
echo "================================" | tee "$RESULTS_DIR/smart-components.txt"
find src -name "*Smart*.tsx" 2>/dev/null | tee -a "$RESULTS_DIR/smart-components.txt"
SMART_COUNT=$(find src -name "*Smart*.tsx" 2>/dev/null | wc -l)
echo "Total Smart components: $SMART_COUNT" | tee -a "$RESULTS_DIR/smart-components.txt"
echo ""

# 6. Documentation Files
echo "6️⃣  Analyzing documentation chaos..."
echo "===================================" | tee "$RESULTS_DIR/documentation.txt"
echo "AGENT_*.md files:" | tee -a "$RESULTS_DIR/documentation.txt"
ls AGENT_*.md 2>/dev/null | wc -l | tee -a "$RESULTS_DIR/documentation.txt"
echo "IMPLEMENTATION_*.md files:" | tee -a "$RESULTS_DIR/documentation.txt"
ls IMPLEMENTATION_*.md 2>/dev/null | wc -l | tee -a "$RESULTS_DIR/documentation.txt"
echo "PHASE_*.md files:" | tee -a "$RESULTS_DIR/documentation.txt"
ls PHASE_*.md 2>/dev/null | wc -l | tee -a "$RESULTS_DIR/documentation.txt"
echo "START_HERE*.md files:" | tee -a "$RESULTS_DIR/documentation.txt"
ls START_HERE*.md 2>/dev/null | wc -l | tee -a "$RESULTS_DIR/documentation.txt"
echo "Total .md files:" | tee -a "$RESULTS_DIR/documentation.txt"
ls *.md 2>/dev/null | wc -l | tee -a "$RESULTS_DIR/documentation.txt"
echo ""

# 7. TypeScript Build
echo "7️⃣  Running TypeScript typecheck..."
echo "===================================" | tee "$RESULTS_DIR/typecheck.txt"
if npx turbo typecheck 2>&1 | tee -a "$RESULTS_DIR/typecheck.txt"; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript check had warnings/errors${NC}"
fi
echo ""

# 8. Lint Check
echo "8️⃣  Running lint check..."
echo "========================" | tee "$RESULTS_DIR/lint.txt"
if npx turbo lint 2>&1 | tee -a "$RESULTS_DIR/lint.txt"; then
    echo -e "${GREEN}✅ Lint check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Lint check had warnings/errors${NC}"
fi
echo ""

# 9. Build Size
echo "9️⃣  Building for production and analyzing size..."
echo "=================================================" | tee "$RESULTS_DIR/build.txt"
if npx turbo build 2>&1 | tee -a "$RESULTS_DIR/build.txt"; then
    echo -e "${GREEN}✅ Build successful${NC}"
    echo "Analyzing dist/ sizes:" | tee -a "$RESULTS_DIR/build.txt"
    du -sh dist/* 2>/dev/null | tee -a "$RESULTS_DIR/build.txt" || echo "No dist/ directory found"
else
    echo -e "${YELLOW}⚠️  Build failed or incomplete${NC}"
fi
echo ""

# 10. Workspace Summary
echo "🔟 Workspace package summary..."
echo "==============================" | tee "$RESULTS_DIR/workspace.txt"
echo "Workspace packages:" | tee -a "$RESULTS_DIR/workspace.txt"
cat pnpm-workspace.yaml | tee -a "$RESULTS_DIR/workspace.txt"
echo ""

# Summary Report
echo ""
echo "📋 BASELINE MEASUREMENT SUMMARY"
echo "================================"
echo ""
echo -e "${GREEN}✅ Measurements complete!${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR/"
echo ""
echo "Files generated:"
ls -lh "$RESULTS_DIR"
echo ""
echo "Next steps:"
echo "1. Review $RESULTS_DIR/coverage.txt for test coverage metrics"
echo "2. Check $RESULTS_DIR/page-sizes.txt for oversized pages"
echo "3. Validate $RESULTS_DIR/agents.txt against claimed 22/47 agents"
echo "4. Review $RESULTS_DIR/build.txt for bundle size analysis"
echo ""
echo "🎯 Ready to start implementation!"
