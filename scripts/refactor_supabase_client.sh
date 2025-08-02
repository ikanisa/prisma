#!/usr/bin/env bash
set -euo pipefail

# This script refactors all Supabase edge function files to use the shared helper
# located at supabase/functions/client.ts instead of inlining createClient.

find supabase/functions -type f -name "*.ts" ! -path "*supabase/functions/client.ts" | while read -r file; do
  # Insert shared client import if missing
  if ! grep -q "import { supabaseClient }" "$file"; then
    sed -E -i '' '1s|^|import { supabaseClient } from "./client.ts";\n|' "$file"
  fi
  # Remove inline createClient imports
  sed -E -i '' '/import .*createClient.*supabase-js.*/d' "$file"
  # Remove inline URL/key constant definitions
  sed -E -i '' '/const SUPABASE_URL/d' "$file"
  sed -E -i '' '/const SUPABASE_SERVICE_ROLE_KEY/d' "$file"
  # Remove any createClient(...) invocations
  sed -i '' '/createClient(/d' "$file"
  # Normalize usage to shared helper
  sed -E -i '' 's#const supabase\s*=.*;#export const supabase = supabaseClient;#g' "$file" || true
done
