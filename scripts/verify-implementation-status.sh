#!/bin/bash
# Prisma Glow - Implementation Status Verification Script
# Generated: January 28, 2025
# Purpose: Verify ground truth of all claimed implementations

set -e

echo "🔍 PRISMA GLOW - IMPLEMENTATION STATUS VERIFICATION"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Output file
OUTPUT="VERIFICATION_REPORT_$(date +%Y%m%d_%H%M%S).md"

# Header
cat > "$OUTPUT" << EOF
# 🔍 Implementation Verification Report
**Generated:** $(date +"%B %d, %Y at %H:%M:%S")  
**Repository:** $(git remote get-url origin 2>/dev/null || echo "N/A")  
**Branch:** $(git branch --show-current 2>/dev/null || echo "N/A")  
**Commit:** $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")

---

## 📊 AGENT IMPLEMENTATION STATUS

EOF

echo "📦 Checking Agent Implementations..."
echo ""

# Function to count files in a package
count_agents() {
    local package=$1
    local path="packages/$package/src/agents"
    
    if [ -d "$path" ]; then
        count=$(find "$path" -name "*.ts" -type f 2>/dev/null | wc -l | tr -d ' ')
        files=$(find "$path" -name "*.ts" -type f 2>/dev/null)
        
        echo "### $package" >> "$OUTPUT"
        echo "**Files found:** $count" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
        
        if [ $count -gt 0 ]; then
            echo '```' >> "$OUTPUT"
            echo "$files" >> "$OUTPUT"
            echo '```' >> "$OUTPUT"
            echo "" >> "$OUTPUT"
            
            # Count LOC
            total_loc=0
            while IFS= read -r file; do
                if [ -f "$file" ]; then
                    loc=$(wc -l < "$file" | tr -d ' ')
                    total_loc=$((total_loc + loc))
                fi
            done <<< "$files"
            
            echo "**Total LOC:** $total_loc" >> "$OUTPUT"
            echo "" >> "$OUTPUT"
            
            echo -e "${GREEN}✅ $package: $count files ($total_loc LOC)${NC}"
        else
            echo -e "${RED}❌ $package: No files found${NC}"
        fi
    else
        echo "**Status:** ❌ Directory not found" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
        echo -e "${RED}❌ $package: Directory not found${NC}"
    fi
    
    echo "---" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
}

# Check each agent package
count_agents "tax"
count_agents "audit"
count_agents "accounting"
count_agents "orchestrators"
count_agents "corporate-services"
count_agents "operational"
count_agents "support"

echo ""
echo "🎨 Checking UI Components..."
echo ""

cat >> "$OUTPUT" << EOF
## 🎨 UI COMPONENT STATUS

### Layout Components

EOF

# Layout components
if [ -d "src/components/layout" ]; then
    layout_count=$(find src/components/layout -name "*.tsx" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "**Files found:** $layout_count" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    find src/components/layout -name "*.tsx" -type f 2>/dev/null >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${GREEN}✅ Layout components: $layout_count files${NC}"
else
    echo "**Status:** ❌ Directory not found" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${RED}❌ Layout components: Directory not found${NC}"
fi

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Smart components
cat >> "$OUTPUT" << EOF
### Smart Components

EOF

if [ -d "src/components/smart" ]; then
    smart_count=$(find src/components/smart -name "*.tsx" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "**Files found:** $smart_count" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    find src/components/smart -name "*.tsx" -type f 2>/dev/null >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${GREEN}✅ Smart components: $smart_count files${NC}"
else
    echo "**Status:** ❌ Directory not found" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${RED}❌ Smart components: Directory not found${NC}"
fi

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo ""
echo "📄 Checking Page Sizes..."
echo ""

cat >> "$OUTPUT" << EOF
## 📄 PAGE SIZE ANALYSIS

### Pages >10KB (Need Refactoring)

| File | Size | Status |
|------|------|--------|
EOF

# Find large pages
if [ -d "src/pages" ]; then
    large_pages=0
    while IFS= read -r line; do
        size=$(echo "$line" | awk '{print $1}')
        file=$(echo "$line" | awk '{print $2}')
        filename=$(basename "$file")
        
        # Convert size to KB
        size_kb=$(echo "$size" | sed 's/K//')
        
        status="🔴 Critical"
        if [ "$size_kb" -lt 10 ]; then
            status="🟢 OK"
        elif [ "$size_kb" -lt 15 ]; then
            status="🟡 Warning"
        fi
        
        echo "| $filename | $size | $status |" >> "$OUTPUT"
        
        if [ "$size_kb" -ge 10 ]; then
            large_pages=$((large_pages + 1))
            echo -e "${YELLOW}⚠️  $filename: $size${NC}"
        fi
    done < <(find src/pages -name "*.tsx" -exec du -h {} \; | sort -rh | head -20)
    
    echo "" >> "$OUTPUT"
    echo "**Total pages >10KB:** $large_pages" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    if [ $large_pages -eq 0 ]; then
        echo -e "${GREEN}✅ All pages are optimized (<10KB)${NC}"
    else
        echo -e "${YELLOW}⚠️  $large_pages pages need refactoring${NC}"
    fi
else
    echo "**Status:** ❌ Directory not found" >> "$OUTPUT"
    echo -e "${RED}❌ Pages directory not found${NC}"
fi

echo ""
echo "🔧 Running Build Analysis..."
echo ""

cat >> "$OUTPUT" << EOF
---

## 🔧 BUILD & PERFORMANCE METRICS

### Build Status

EOF

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo "❌ Dependencies NOT installed - Run: pnpm install --frozen-lockfile" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${RED}❌ Dependencies not installed${NC}"
    echo -e "${YELLOW}   Run: pnpm install --frozen-lockfile${NC}"
fi

# Check if build exists
if [ -d "dist" ]; then
    echo "### Bundle Size" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    du -sh dist/ >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    ls -lh dist/*.js 2>/dev/null | head -10 >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    
    bundle_size=$(du -sh dist/ | awk '{print $1}')
    echo -e "${GREEN}✅ Build exists: $bundle_size${NC}"
else
    echo "⚠️ Build not found - Run: pnpm run build" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${YELLOW}⚠️  Build not found - Run: pnpm run build${NC}"
fi

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Test coverage
cat >> "$OUTPUT" << EOF
### Test Coverage

EOF

if [ -d "coverage" ]; then
    echo '```' >> "$OUTPUT"
    if [ -f "coverage/coverage-summary.json" ]; then
        cat coverage/coverage-summary.json | jq '.total' >> "$OUTPUT" 2>/dev/null || echo "Unable to parse coverage JSON" >> "$OUTPUT"
    else
        echo "Coverage summary not found" >> "$OUTPUT"
    fi
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${GREEN}✅ Coverage report exists${NC}"
else
    echo "⚠️ Coverage not found - Run: pnpm run coverage" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo -e "${YELLOW}⚠️  Coverage not found - Run: pnpm run coverage${NC}"
fi

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Git status
echo ""
echo "📊 Checking Git Status..."
echo ""

cat >> "$OUTPUT" << EOF
## 📊 GIT STATUS

### Modified Files

\`\`\`
EOF

git status --short >> "$OUTPUT" 2>/dev/null || echo "Not a git repository" >> "$OUTPUT"

cat >> "$OUTPUT" << EOF
\`\`\`

### Recent Commits

\`\`\`
EOF

git log --oneline -10 >> "$OUTPUT" 2>/dev/null || echo "No git history" >> "$OUTPUT"

cat >> "$OUTPUT" << EOF
\`\`\`

---

## 📋 SUMMARY

### Quick Stats

EOF

# Calculate totals
total_agents=$(find packages/*/src/agents -name "*.ts" -type f 2>/dev/null | wc -l | tr -d ' ')
total_layout=$(find src/components/layout -name "*.tsx" -type f 2>/dev/null | wc -l | tr -d ' ')
total_smart=$(find src/components/smart -name "*.tsx" -type f 2>/dev/null | wc -l | tr -d ' ')

cat >> "$OUTPUT" << EOF
- **Total Agents:** $total_agents
- **Layout Components:** $total_layout
- **Smart Components:** $total_smart
- **Large Pages:** $large_pages

### Completion Estimate

\`\`\`
Target: 47 agents
Actual: $total_agents agents
Progress: $(( total_agents * 100 / 47 ))%
\`\`\`

### Next Steps

1. Review this report: \`$OUTPUT\`
2. Run missing checks:
   - \`pnpm install --frozen-lockfile\` (if needed)
   - \`pnpm run build\`
   - \`pnpm run coverage\`
   - \`pnpm run typecheck\`
   - \`pnpm run lint\`
3. Implement missing agents ($(( 47 - total_agents )) remaining)
4. Refactor large pages ($large_pages files)
5. Complete smart components ($(( 8 - total_smart )) remaining)

---

**Report generated by:** \`scripts/verify-implementation-status.sh\`  
**Next review:** End of Week 0 (Feb 2, 2025)
EOF

echo ""
echo "=================================================="
echo "✅ Verification complete!"
echo "📄 Report saved to: $OUTPUT"
echo ""
echo "Summary:"
echo "  • Total Agents: $total_agents / 47"
echo "  • Layout Components: $total_layout"
echo "  • Smart Components: $total_smart"
echo "  • Large Pages: $large_pages"
echo ""
echo "Next: Review the full report for details"
echo "=================================================="
