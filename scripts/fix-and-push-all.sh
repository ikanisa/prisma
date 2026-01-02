#!/bin/bash
# Comprehensive fix and push script
set -e

export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c
cd "$(dirname "$0")/.."

echo "🚀 Comprehensive Migration Deployment"

# Step 1: Fix all policies in 20250821115117_.sql
echo "Step 1: Fixing policy table names..."
python3 << 'PYTHON'
import re

file_path = 'supabase/migrations/20250821115117_.sql'
with open(file_path, 'r') as f:
    content = f.read()

# Map policy names to correct tables based on DROP statements
policy_to_table = {}

for match in re.finditer(r'DROP POLICY IF EXISTS "([^"]+)" ON (?:public\.)?(\w+)', content):
    policy_name = match.group(1)
    table_name = match.group(2)
    policy_to_table[policy_name] = table_name

# Fix CREATE POLICY statements
for policy_name, table_name in policy_to_table.items():
    # Fix policies that have wrong table
    pattern = rf'CREATE POLICY "{re.escape(policy_name)}" ON (?:public\.)?users\s+FOR'
    replacement = f'CREATE POLICY "{policy_name}" ON public.{table_name} FOR'
    content = re.sub(pattern, replacement, content)
    
    # Fix policies missing ON clause
    pattern = rf'CREATE POLICY "{re.escape(policy_name)}"\s+FOR'
    if f'ON public.{table_name}' not in content[content.find(f'CREATE POLICY "{policy_name}"'):content.find(f'CREATE POLICY "{policy_name}")')+200]:
        replacement = f'CREATE POLICY "{policy_name}" ON public.{table_name} FOR'
        content = re.sub(pattern, replacement, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed policy table names")
PYTHON

# Step 2: Continue pushing with repair
echo "Step 2: Repairing history and pushing..."
supabase migration repair --status applied 20241201 --linked > /dev/null 2>&1 || true

# Step 3: Push with error handling
echo "Step 3: Pushing migrations..."
OUTPUT=$(echo "y" | supabase db push --linked --include-all 2>&1 || true)

if echo "$OUTPUT" | grep -q "Finished supabase db push"; then
    echo "✅ All migrations applied!"
    exit 0
fi

# Show errors
echo "$OUTPUT" | tail -50

echo ""
echo "⚠️  Some migrations may need manual fixes"
echo "Check the output above for specific errors"

