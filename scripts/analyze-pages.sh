#!/bin/bash

# Script to analyze page sizes and identify refactoring candidates
# Usage: ./scripts/analyze-pages.sh

echo "🔍 Analyzing Page Sizes..."
echo "======================================"
echo ""

# Find all page files and their sizes
echo "Top 20 Largest Page Files:"
echo "Rank | Size (KB) | File"
echo "-----|-----------|-----"

find src/pages -name "*.tsx" -type f -exec wc -c {} \; | \
  sort -rn | \
  head -20 | \
  awk '{
    size_kb = $1 / 1024
    file = $2
    rank++
    printf "%2d   | %8.1f  | %s\n", rank, size_kb, file
  }'

echo ""
echo "======================================"
echo ""

# Count files by size category
HUGE=$(find src/pages -name "*.tsx" -type f -size +50k | wc -l)
LARGE=$(find src/pages -name "*.tsx" -type f -size +30k -size -50k | wc -l)
MEDIUM=$(find src/pages -name "*.tsx" -type f -size +10k -size -30k | wc -l)
SMALL=$(find src/pages -name "*.tsx" -type f -size -10k | wc -l)

echo "📊 Size Distribution:"
echo "  🔴 Huge (>50KB):   $HUGE files - URGENT REFACTOR"
echo "  🟡 Large (30-50KB): $LARGE files - High Priority"
echo "  🟢 Medium (10-30KB): $MEDIUM files - Consider Refactor"
echo "  ✅ Small (<10KB):   $SMALL files - Good Size"

echo ""
echo "======================================"
echo ""

# Calculate total
TOTAL=$((HUGE + LARGE + MEDIUM + SMALL))
echo "📈 Summary:"
echo "  Total page files: $TOTAL"
echo "  Needs refactor: $((HUGE + LARGE)) files ($((((HUGE + LARGE) * 100) / TOTAL))%)"
echo ""

# Priority recommendations
echo "🎯 Priority Actions:"
if [ $HUGE -gt 0 ]; then
  echo "  1. Refactor $HUGE huge files immediately"
fi
if [ $LARGE -gt 0 ]; then
  echo "  2. Schedule $LARGE large files for next sprint"
fi
if [ $MEDIUM -gt 0 ]; then
  echo "  3. Review $MEDIUM medium files for optimization"
fi

echo ""
echo "✨ Run './scripts/create-feature-component.sh <feature> <component>' to create components"
echo ""
