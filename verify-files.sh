#!/bin/bash
# Verify that all required files exist for Netlify build

echo "=== Verifying required files for apps/web build ==="
echo "Current directory: $(pwd)"
echo "Git commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
echo ""

FILES=(
  "apps/web/components/ui/button.tsx"
  "apps/web/components/ui/input.tsx"
  "apps/web/components/ui/label.tsx"
  "apps/web/components/ui/tabs.tsx"
  "apps/web/lib/supabase/client.ts"
  "apps/web/lib/utils/cn.ts"
  "apps/web/tsconfig.json"
)

MISSING=0
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ MISSING: $file"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo "✅ All files present!"
  exit 0
else
  echo "❌ $MISSING file(s) missing!"
  exit 1
fi
