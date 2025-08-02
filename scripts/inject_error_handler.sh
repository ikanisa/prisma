#!/usr/bin/env bash
set -euo pipefail

# Wrap serve handlers in Supabase edge functions with centralized error handler
find supabase/functions -type f -name 'index.ts' ! -path '*_shared/*' | while read -r file; do
  # Insert import of errorHandler if missing
  if ! grep -q "withErrorHandling" "$file"; then
    sed -E -i '' '1s|^|import { withErrorHandling } from "./_shared/errorHandler.ts";\n|' "$file"
  fi
  # Wrap serve(async => ...) calls
  sed -E -i '' 's|serve\(async \(req\)|serve(withErrorHandling(async (req)|g' "$file"
done
echo "Injected error handling into edge functions."
