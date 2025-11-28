#!/bin/bash

# Script to batch refactor a page by extracting sections
# Usage: ./scripts/refactor-page.sh <page-path>

PAGE=$1

if [ -z "$PAGE" ]; then
  echo "❌ Error: Missing page path"
  echo ""
  echo "Usage: ./scripts/refactor-page.sh <page-path>"
  echo ""
  echo "Example:"
  echo "  ./scripts/refactor-page.sh src/pages/documents.tsx"
  echo ""
  exit 1
fi

if [ ! -f "$PAGE" ]; then
  echo "❌ Error: File not found: $PAGE"
  exit 1
fi

# Extract feature name from path
FEATURE=$(basename $(dirname "$PAGE"))
PAGE_NAME=$(basename "$PAGE" .tsx)

echo "🔧 Refactoring: $PAGE"
echo "📁 Feature: $FEATURE"
echo "📄 Page: $PAGE_NAME"
echo ""

# Analyze the file
SIZE=$(wc -c < "$PAGE")
SIZE_KB=$((SIZE / 1024))
LINES=$(wc -l < "$PAGE")

echo "📊 Current Stats:"
echo "  Size: ${SIZE_KB}KB"
echo "  Lines: $LINES"
echo ""

# Provide recommendations
echo "💡 Refactoring Recommendations:"
echo ""

if [ $SIZE_KB -gt 50 ]; then
  echo "  🔴 CRITICAL: File is very large (${SIZE_KB}KB)"
  echo "     Recommended: Split into 5-8 components"
elif [ $SIZE_KB -gt 30 ]; then
  echo "  🟡 WARNING: File is large (${SIZE_KB}KB)"
  echo "     Recommended: Split into 3-5 components"
elif [ $SIZE_KB -gt 10 ]; then
  echo "  🟢 MEDIUM: File could be optimized (${SIZE_KB}KB)"
  echo "     Recommended: Split into 2-3 components"
else
  echo "  ✅ GOOD: File size is acceptable (${SIZE_KB}KB)"
  echo "     Optional: Minor optimizations possible"
fi

echo ""
echo "📋 Suggested Component Structure:"
echo ""
echo "  src/components/features/${FEATURE}/"
echo "    ├── ${PAGE_NAME^}Header.tsx"
echo "    ├── ${PAGE_NAME^}Filters.tsx"
echo "    ├── ${PAGE_NAME^}List.tsx"
echo "    ├── ${PAGE_NAME^}Details.tsx"
echo "    └── index.ts"
echo ""

echo "🚀 Quick Actions:"
echo ""
echo "  1. Create feature directory:"
echo "     mkdir -p src/components/features/${FEATURE}"
echo ""
echo "  2. Create components:"
echo "     ./scripts/create-feature-component.sh ${FEATURE} ${PAGE_NAME^}Header"
echo "     ./scripts/create-feature-component.sh ${FEATURE} ${PAGE_NAME^}List"
echo ""
echo "  3. Refactor the page to use new components"
echo ""

# Ask if user wants to create the structure
read -p "Create component structure now? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  mkdir -p "src/components/features/${FEATURE}"
  
  # Create common components
  ./scripts/create-feature-component.sh "${FEATURE}" "${PAGE_NAME^}Header"
  ./scripts/create-feature-component.sh "${FEATURE}" "${PAGE_NAME^}List"
  
  echo ""
  echo "✅ Component structure created!"
  echo "📝 Edit the components and refactor your page"
fi

echo ""
