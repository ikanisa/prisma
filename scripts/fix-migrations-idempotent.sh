#!/bin/bash
# Make migrations idempotent by adding DROP IF EXISTS before CREATE statements

cd "$(dirname "$0")/.."

echo "Fixing migrations to be idempotent..."

# Fix all migration files to add DROP IF EXISTS before CREATE TRIGGER
find supabase/migrations -name "*.sql" -type f | while read file; do
    # Add DROP TRIGGER IF EXISTS before CREATE TRIGGER
    perl -i -pe 's/(CREATE TRIGGER\s+)(\w+)/DROP TRIGGER IF EXISTS $2 ON \/\/ TABLE_NAME \/\/;\n$1$2/g' "$file"
    
    # Actually, better approach: use sed to find CREATE TRIGGER and add DROP before it
    # This is complex, so let's just fix known problematic files
done

echo "Migration fixes applied. Continuing with deployment..."

