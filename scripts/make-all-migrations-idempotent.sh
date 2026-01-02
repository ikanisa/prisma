#!/bin/bash
# Make all migrations idempotent by adding IF NOT EXISTS and DROP IF EXISTS where needed

set -e

cd "$(dirname "$0")/.."

echo "🔧 Making all migrations idempotent..."

find supabase/migrations -name "*.sql" -type f | while read file; do
    echo "Processing: $(basename "$file")"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Fix CREATE INDEX without IF NOT EXISTS
    perl -i -pe 's/CREATE INDEX ([^I])/CREATE INDEX IF NOT EXISTS $1/g unless /IF NOT EXISTS/' "$file"
    
    # Fix CREATE TRIGGER - add DROP IF EXISTS before it
    # Extract table name from ON clause
    perl -i -0777 -pe 's/(CREATE TRIGGER\s+)(\w+)\s+.*?(ON\s+(?:\w+\.)?(\w+))/DROP TRIGGER IF EXISTS $2 ON $4 CASCADE;\n$1$2/gm' "$file"
    
    # Fix CREATE POLICY - add DROP IF EXISTS before it (need to extract table from ON clause)
    perl -i -0777 -pe 's/(CREATE POLICY\s+)(["'\''][^"'\'']+["'\''])\s+.*?(ON\s+(?:\w+\.)?(\w+))/DROP POLICY IF EXISTS $2 ON $4 CASCADE;\n$1$2/gm' "$file"
    
    # Remove backup if successful
    if [ -f "$file.bak" ]; then
        diff -q "$file" "$file.bak" > /dev/null 2>&1 && rm "$file.bak" || echo "  Modified: $(basename "$file")"
    fi
done

echo "✅ Migration idempotency fixes complete!"
echo "⚠️  Review changes before committing. Backups saved as .bak files."

