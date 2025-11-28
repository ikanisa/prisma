#!/usr/bin/env bash
#
# Ground Truth Audit Script
# Verifies actual implementation status vs. documentation claims
# 
# Usage: ./scripts/ground-truth-audit.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="GROUND_TRUTH_AUDIT_REPORT.md"

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PRISMA GLOW - GROUND TRUTH AUDIT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Start report
cat > "$OUTPUT_FILE" << 'EOF'
# 🔍 GROUND TRUTH AUDIT REPORT
## Actual Implementation Status vs. Documentation Claims

**Generated:** $(date +"%B %d, %Y at %H:%M:%S")  
**Script:** scripts/ground-truth-audit.sh  
**Purpose:** Verify actual codebase status

---

## 📊 AGENT IMPLEMENTATION STATUS

EOF

echo -e "${GREEN}[1/7]${NC} Auditing agent implementations..."

# Function to count agent files
count_agents() {
    local package=$1
    local path="packages/$package/src/agents"
    
    if [ -d "$path" ]; then
        count=$(find "$path" -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" -not -name "index.ts" | wc -l | tr -d ' ')
        files=$(find "$path" -name "*.ts" -not -name "*.test.ts" -not -name "*.spec.ts" -not -name "index.ts" -exec basename {} \; | sort)
        echo "$count|$files"
    else
        echo "0|"
    fi
}

# Audit agents
declare -A AGENT_PACKAGES=(
    ["tax"]="Tax Agents"
    ["audit"]="Audit Agents"
    ["accounting"]="Accounting Agents"
    ["orchestrators"]="Orchestrators"
    ["corporate-services"]="Corporate Services"
    ["operational"]="Operational Agents"
    ["support"]="Support Agents"
)

declare -A EXPECTED_COUNTS=(
    ["tax"]=12
    ["audit"]=10
    ["accounting"]=8
    ["orchestrators"]=3
    ["corporate-services"]=6
    ["operational"]=4
    ["support"]=4
)

cat >> "$OUTPUT_FILE" << 'EOF'
### Agent Package Summary

| Package | Expected | Actual | Status | Completion |
|---------|----------|--------|--------|------------|
EOF

TOTAL_EXPECTED=0
TOTAL_ACTUAL=0

# Sort packages for consistent output
packages=($(echo "${!AGENT_PACKAGES[@]}" | tr ' ' '\n' | sort))

for package in "${packages[@]}"; do
    result=$(count_agents "$package")
    actual=$(echo "$result" | cut -d'|' -f1)
    expected=${EXPECTED_COUNTS[$package]}
    name=${AGENT_PACKAGES[$package]}
    
    TOTAL_EXPECTED=$((TOTAL_EXPECTED + expected))
    TOTAL_ACTUAL=$((TOTAL_ACTUAL + actual))
    
    if [ "$actual" -eq "$expected" ]; then
        status="✅ Complete"
        completion="100%"
    elif [ "$actual" -gt 0 ]; then
        status="🟡 Partial"
        completion="$((actual * 100 / expected))%"
    else
        status="🔴 Not Started"
        completion="0%"
    fi
    
    echo "| $name | $expected | $actual | $status | $completion |" >> "$OUTPUT_FILE"
    echo -e "  ${name}: ${actual}/${expected} files"
done

cat >> "$OUTPUT_FILE" << EOF

**TOTAL: $TOTAL_ACTUAL/$TOTAL_EXPECTED agents ($((TOTAL_ACTUAL * 100 / TOTAL_EXPECTED))% complete)**

---

### Detailed Agent Files

EOF

# List all agent files
for package in "${!AGENT_PACKAGES[@]}"; do
    result=$(count_agents "$package")
    actual=$(echo "$result" | cut -d'|' -f1)
    files=$(echo "$result" | cut -d'|' -f2)
    name=${AGENT_PACKAGES[$package]}
    
    echo "#### $name ($actual files)" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    if [ "$actual" -gt 0 ]; then
        echo '```' >> "$OUTPUT_FILE"
        echo "$files" | tr ' ' '\n' >> "$OUTPUT_FILE"
        echo '```' >> "$OUTPUT_FILE"
    else
        echo "*No agent files found*" >> "$OUTPUT_FILE"
    fi
    echo "" >> "$OUTPUT_FILE"
done

echo ""
echo -e "${GREEN}[2/7]${NC} Auditing UI components..."

cat >> "$OUTPUT_FILE" << 'EOF'
## 🎨 UI/UX COMPONENTS STATUS

### Layout Components

EOF

if [ -d "src/components/layout" ]; then
    layout_count=$(find src/components/layout -name "*.tsx" -not -name "*.test.tsx" -not -name "*.stories.tsx" | wc -l | tr -d ' ')
    echo "**Found: $layout_count components**" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    find src/components/layout -name "*.tsx" -not -name "*.test.tsx" -not -name "*.stories.tsx" -exec basename {} \; | sort >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
else
    echo "**Status:** ⚠️ Directory not found" >> "$OUTPUT_FILE"
    layout_count=0
fi

echo -e "  Layout components: $layout_count found (expected: 7)"

cat >> "$OUTPUT_FILE" << 'EOF'

### Smart Components

EOF

if [ -d "src/components/smart" ]; then
    smart_count=$(find src/components/smart -name "*.tsx" -not -name "*.test.tsx" -not -name "*.stories.tsx" | wc -l | tr -d ' ')
    echo "**Found: $smart_count components**" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    find src/components/smart -name "*.tsx" -not -name "*.test.tsx" -not -name "*.stories.tsx" -exec basename {} \; | sort >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
else
    echo "**Status:** ⚠️ Directory not found" >> "$OUTPUT_FILE"
    smart_count=0
fi

echo -e "  Smart components: $smart_count found (expected: 8)"

echo ""
echo -e "${GREEN}[3/7]${NC} Analyzing page sizes..."

cat >> "$OUTPUT_FILE" << 'EOF'

## 📄 PAGE FILE SIZES

### Pages Analysis

| Page | Size | Status |
|------|------|--------|
EOF

if [ -d "src/pages" ]; then
    find src/pages -name "*.tsx" -not -name "*-example.tsx" | while read -r file; do
        size=$(wc -c < "$file" | tr -d ' ')
        size_kb=$((size / 1024))
        basename=$(basename "$file")
        
        if [ "$size" -lt 8000 ]; then
            status="✅ <8KB"
        elif [ "$size" -lt 10000 ]; then
            status="🟡 8-10KB"
        else
            status="🔴 >10KB"
        fi
        
        echo "| $basename | ${size_kb}KB | $status |" >> "$OUTPUT_FILE"
    done
fi

echo ""
echo -e "${GREEN}[4/7]${NC} Checking performance metrics..."

cat >> "$OUTPUT_FILE" << 'EOF'

---

## ⚡ PERFORMANCE METRICS

### Bundle Size

EOF

# Try to get bundle size from last build
if [ -d "dist" ]; then
    total_size=$(du -sh dist 2>/dev/null | cut -f1 || echo "N/A")
    echo "**Last build size:** $total_size" >> "$OUTPUT_FILE"
    echo -e "  Bundle size: $total_size"
else
    echo "**Status:** ⚠️ No dist directory found (run \`pnpm run build\`)" >> "$OUTPUT_FILE"
    echo -e "  ${YELLOW}Bundle size: Not built yet${NC}"
fi

cat >> "$OUTPUT_FILE" << 'EOF'

### Test Coverage

EOF

echo ""
echo -e "${GREEN}[5/7]${NC} Checking test coverage..."

if [ -d "coverage" ]; then
    if [ -f "coverage/coverage-summary.json" ]; then
        # Parse coverage summary (requires jq)
        if command -v jq &> /dev/null; then
            statements=$(jq -r '.total.statements.pct' coverage/coverage-summary.json 2>/dev/null || echo "N/A")
            branches=$(jq -r '.total.branches.pct' coverage/coverage-summary.json 2>/dev/null || echo "N/A")
            functions=$(jq -r '.total.functions.pct' coverage/coverage-summary.json 2>/dev/null || echo "N/A")
            lines=$(jq -r '.total.lines.pct' coverage/coverage-summary.json 2>/dev/null || echo "N/A")
            
            cat >> "$OUTPUT_FILE" << EOF
| Metric | Coverage |
|--------|----------|
| Statements | ${statements}% |
| Branches | ${branches}% |
| Functions | ${functions}% |
| Lines | ${lines}% |
EOF
            echo -e "  Coverage: ${statements}% statements"
        else
            echo "**Status:** ⚠️ jq not installed, cannot parse coverage data" >> "$OUTPUT_FILE"
        fi
    else
        echo "**Status:** ⚠️ Coverage summary not found (run \`pnpm run coverage\`)" >> "$OUTPUT_FILE"
    fi
else
    echo "**Status:** ⚠️ No coverage directory found (run \`pnpm run coverage\`)" >> "$OUTPUT_FILE"
    echo -e "  ${YELLOW}Coverage: Not run yet${NC}"
fi

echo ""
echo -e "${GREEN}[6/7]${NC} Checking infrastructure..."

cat >> "$OUTPUT_FILE" << 'EOF'

---

## 🏗️ INFRASTRUCTURE STATUS

### Database Migrations

EOF

# Count Supabase migrations
if [ -d "supabase/migrations" ]; then
    supabase_migrations=$(find supabase/migrations -name "*.sql" | wc -l | tr -d ' ')
    echo "**Supabase migrations:** $supabase_migrations files" >> "$OUTPUT_FILE"
    echo -e "  Supabase migrations: $supabase_migrations"
else
    echo "**Supabase migrations:** ⚠️ Directory not found" >> "$OUTPUT_FILE"
fi

# Count Prisma migrations
if [ -d "apps/web/prisma/migrations" ]; then
    prisma_migrations=$(find apps/web/prisma/migrations -name "*.sql" | wc -l | tr -d ' ')
    echo "**Prisma migrations:** $prisma_migrations files" >> "$OUTPUT_FILE"
    echo -e "  Prisma migrations: $prisma_migrations"
else
    echo "**Prisma migrations:** ⚠️ Directory not found" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << 'EOF'

### Gemini AI Integration

EOF

# Check for Gemini files
gemini_files=$(find . -name "*gemini*" -o -name "*ai*" | grep -E "\.(ts|tsx|py)$" | grep -v node_modules | grep -v ".git" | wc -l | tr -d ' ')
echo "**Gemini-related files:** $gemini_files" >> "$OUTPUT_FILE"
echo -e "  Gemini files: $gemini_files"

# Check for Tauri
if [ -d "src-tauri" ]; then
    echo "**Tauri desktop app:** ✅ Initialized" >> "$OUTPUT_FILE"
    echo -e "  Tauri: ${GREEN}Initialized${NC}"
else
    echo "**Tauri desktop app:** 🔴 Not initialized" >> "$OUTPUT_FILE"
    echo -e "  Tauri: ${RED}Not initialized${NC}"
fi

echo ""
echo -e "${GREEN}[7/7]${NC} Finalizing report..."

cat >> "$OUTPUT_FILE" << 'EOF'

---

## 📊 SUMMARY & RECOMMENDATIONS

### Implementation Status Summary

EOF

# Calculate overall completion
overall_pct=$((TOTAL_ACTUAL * 100 / TOTAL_EXPECTED))

cat >> "$OUTPUT_FILE" << EOF
**Agent Implementation:** $TOTAL_ACTUAL/$TOTAL_EXPECTED ($overall_pct%)

EOF

# Recommendations
cat >> "$OUTPUT_FILE" << 'EOF'
### Recommendations

Based on this audit, the following actions are recommended:

1. **Priority 1: Complete missing agents**
   - Focus on packages with 0 agents first
   - Follow existing patterns from completed packages

2. **Priority 2: Verify UI components**
   - Check if layout/smart components match expected count
   - Build missing components as needed

3. **Priority 3: Performance optimization**
   - Run full build and measure bundle size
   - Run coverage report to get accurate metrics
   - Run Lighthouse audit for baseline

4. **Priority 4: Documentation sync**
   - Update all documentation to match actual status
   - Archive conflicting/outdated plans
   - Create single source of truth

---

## 🎯 NEXT STEPS

1. **Review this report** with tech lead and team
2. **Run missing measurements**:
   ```bash
   pnpm run build        # Get bundle size
   pnpm run coverage     # Get test coverage
   pnpm run lighthouse   # Get performance score
   ```
3. **Create gap analysis** based on findings
4. **Update unified implementation plan**

---

**Report Generated:** $(date +"%B %d, %Y at %H:%M:%S")  
**Audit Script:** scripts/ground-truth-audit.sh  
**Status:** ✅ Complete

EOF

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Ground truth audit complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "Report saved to: ${GREEN}$OUTPUT_FILE${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Review $OUTPUT_FILE"
echo -e "  2. Run: ${YELLOW}pnpm run build && pnpm run coverage${NC}"
echo -e "  3. Create gap analysis"
echo ""
