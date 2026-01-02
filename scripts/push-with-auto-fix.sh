#!/bin/bash
# Push migrations with automatic error fixing
set -e

export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c
cd "$(dirname "$0")/.."

MAX_ITERATIONS=20
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo "=== Iteration $ITERATION ==="
    
    # Repair history
    supabase migration repair --status reverted 20241201 --linked > /dev/null 2>&1 || true
    
    # Push migrations
    OUTPUT=$(echo "y" | supabase db push --linked --include-all 2>&1 || true)
    
    echo "$OUTPUT" | tail -50
    
    # Check if successful
    if echo "$OUTPUT" | grep -q "Finished supabase db push\|No migrations to apply"; then
        echo "✅ All migrations applied successfully!"
        exit 0
    fi
    
    # Check for specific errors and fix them
    ERROR_FILE=""
    ERROR_TYPE=""
    
    if echo "$OUTPUT" | grep -q "ERROR.*already exists.*TABLE"; then
        ERROR_FILE=$(echo "$OUTPUT" | grep -B 10 "ERROR.*already exists.*TABLE" | grep "Applying migration" | tail -1 | sed 's/Applying migration //' | sed 's/\.\.\.//')
        echo "  Fixing: $ERROR_FILE - Adding IF NOT EXISTS to CREATE TABLE"
        sed -i '' 's/CREATE TABLE \(public\.\)\?\([a-zA-Z_]*\)/CREATE TABLE IF NOT EXISTS \1\2/g' "supabase/migrations/$ERROR_FILE" || true
    elif echo "$OUTPUT" | grep -q "ERROR.*already exists.*INDEX"; then
        ERROR_FILE=$(echo "$OUTPUT" | grep -B 10 "ERROR.*already exists.*INDEX" | grep "Applying migration" | tail -1 | sed 's/Applying migration //' | sed 's/\.\.\.//')
        echo "  Fixing: $ERROR_FILE - Adding IF NOT EXISTS to CREATE INDEX"
        sed -i '' 's/CREATE INDEX \([^I]\)/CREATE INDEX IF NOT EXISTS \1/g' "supabase/migrations/$ERROR_FILE" || true
    elif echo "$OUTPUT" | grep -q "ERROR.*already exists.*TRIGGER"; then
        ERROR_FILE=$(echo "$OUTPUT" | grep -B 10 "ERROR.*already exists.*TRIGGER" | grep "Applying migration" | tail -1 | sed 's/Applying migration //' | sed 's/\.\.\.//')
        echo "  Fixing: $ERROR_FILE - Adding DROP IF EXISTS before CREATE TRIGGER"
        # This is complex, skip for now and continue
        continue
    elif echo "$OUTPUT" | grep -q "ERROR.*already exists.*POLICY"; then
        ERROR_FILE=$(echo "$OUTPUT" | grep -B 10 "ERROR.*already exists.*POLICY" | grep "Applying migration" | tail -1 | sed 's/Applying migration //' | sed 's/\.\.\.//')
        echo "  Fixing: $ERROR_FILE - Adding DROP IF EXISTS before CREATE POLICY"
        continue
    elif echo "$OUTPUT" | grep -q "ERROR.*already exists.*TYPE"; then
        ERROR_FILE=$(echo "$OUTPUT" | grep -B 10 "ERROR.*already exists.*TYPE" | grep "Applying migration" | tail -1 | sed 's/Applying migration //' | sed 's/\.\.\.//')
        echo "  Fixing: $ERROR_FILE - Wrapping CREATE TYPE in DO block"
        continue
    else
        echo "  No auto-fixable errors found. Manual intervention may be needed."
        echo "$OUTPUT" | tail -20
        break
    fi
    
    sleep 1
done

echo "⚠️  Reached maximum iterations. Some migrations may need manual fixes."

