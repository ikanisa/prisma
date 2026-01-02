#!/bin/bash
# Automatically fix all migrations to be idempotent
set -e

cd "$(dirname "$0")/.."

echo "🔧 Fixing all migrations for idempotency..."

find supabase/migrations -name "*.sql" -type f | while read file; do
    echo "Processing: $(basename "$file")"
    
    # Fix CREATE INDEX without IF NOT EXISTS (but not if it already has it)
    perl -i -pe 's/^(\s*)CREATE INDEX\s+([^I])/$1CREATE INDEX IF NOT EXISTS $2/g' "$file"
    
    # Fix CREATE TRIGGER - add DROP IF EXISTS before it
    # This is more complex - we need to extract the table name
    perl -i -0777 -pe '
        s/(CREATE TRIGGER\s+)(\w+)\s+.*?(ON\s+(?:public\.)?(\w+))/DROP TRIGGER IF EXISTS $2 ON $4 CASCADE;\n$1$2/gm' "$file"
    
    # Fix CREATE POLICY - add DROP IF EXISTS before it
    perl -i -0777 -pe '
        s/(CREATE POLICY\s+)(["'\''][^"'\'']+["'\''])\s+.*?(ON\s+(?:public\.)?(\w+))/DROP POLICY IF EXISTS $2 ON $4 CASCADE;\n$1$2/gm' "$file"
    
done

echo "✅ All migrations fixed!"

