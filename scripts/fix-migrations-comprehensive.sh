#!/bin/bash
# Comprehensive migration fix script
set -e

cd "$(dirname "$0")/.."

echo "🔧 Fixing all migrations comprehensively..."

find supabase/migrations -name "*.sql" -type f | while read file; do
    echo "  Fixing: $(basename "$file")"
    
    # Fix CREATE TABLE without IF NOT EXISTS
    perl -i -pe 's/^CREATE TABLE (?!IF NOT EXISTS)(public\.)?(\w+)/CREATE TABLE IF NOT EXISTS $1$2/g' "$file"
    
    # Fix CREATE INDEX without IF NOT EXISTS
    perl -i -pe 's/^(\s*)CREATE INDEX\s+([^I])/$1CREATE INDEX IF NOT EXISTS $2/g' "$file"
    
    # Fix CREATE TYPE - wrap in DO block
    perl -i -0777 -pe 's/^CREATE TYPE (public\.)?(\w+) AS ENUM/DO \$\$ BEGIN\n  CREATE TYPE $1$2 AS ENUM/g' "$file"
    perl -i -0777 -pe 's/(AS ENUM \([^)]+\);)/$1\nEXCEPTION WHEN duplicate_object THEN null;\nEND \$\$;/g' "$file"
    
    # Fix CREATE TRIGGER - add DROP IF EXISTS before
    perl -i -0777 -pe 's/(CREATE TRIGGER\s+)(\w+)\s+.*?(ON\s+(?:public\.)?(\w+))/DROP TRIGGER IF EXISTS $2 ON $4 CASCADE;\n$1$2/gm' "$file"
    
    # Fix CREATE POLICY - add DROP IF EXISTS before
    perl -i -0777 -pe 's/(CREATE POLICY\s+)(["'\''][^"'\'']+["'\''])\s+.*?(ON\s+(?:public\.)?(\w+))/DROP POLICY IF EXISTS $2 ON $4 CASCADE;\n$1$2/gm' "$file"
    
done

echo "✅ All migrations fixed!"

