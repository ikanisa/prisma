#!/bin/bash
# Complete migration deployment with automatic error fixing
set -e

export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c
cd "$(dirname "$0")/.."

echo "🚀 Starting complete migration deployment..."

# Repair history first
echo "Repairing migration history..."
supabase migration repair --status reverted 20241201 --linked > /dev/null 2>&1 || true

MAX_ITERATIONS=30
ITERATION=0
LAST_ERROR=""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo ""
    echo "=== Iteration $ITERATION ==="
    
    # Push migrations
    OUTPUT=$(echo "y" | supabase db push --linked --include-all 2>&1 || true)
    
    # Check if successful
    if echo "$OUTPUT" | grep -q "Finished supabase db push"; then
        echo "✅ All migrations applied successfully!"
        exit 0
    fi
    
    # Extract error details
    ERROR_LINE=$(echo "$OUTPUT" | grep "ERROR" | tail -1)
    
    if [ -z "$ERROR_LINE" ]; then
        echo "No errors found. Checking status..."
        echo "$OUTPUT" | tail -20
        # If no errors but not finished, might be complete
        if echo "$OUTPUT" | grep -q "No migrations to apply"; then
            echo "✅ No more migrations to apply!"
            exit 0
        fi
        break
    fi
    
    # Prevent infinite loop on same error
    if [ "$ERROR_LINE" = "$LAST_ERROR" ]; then
        echo "⚠️  Same error repeated. Manual fix needed."
        echo "Error: $ERROR_LINE"
        break
    fi
    LAST_ERROR="$ERROR_LINE"
    
    echo "Error found: $ERROR_LINE"
    
    # Extract migration file name
    MIGRATION_FILE=$(echo "$OUTPUT" | grep -B 5 "ERROR" | grep "Applying migration" | tail -1 | sed 's/Applying migration //' | sed 's/\.\.\.//' | xargs)
    
    if [ -z "$MIGRATION_FILE" ]; then
        echo "Could not identify migration file from error"
        echo "$OUTPUT" | tail -30
        break
    fi
    
    echo "Fixing: $MIGRATION_FILE"
    
    # Fix based on error type
    if echo "$ERROR_LINE" | grep -q "already exists.*TABLE"; then
        echo "  → Adding IF NOT EXISTS to CREATE TABLE"
        sed -i '' 's/^CREATE TABLE \(public\.\)\?\([a-zA-Z_]*\) /CREATE TABLE IF NOT EXISTS \1\2 /g' "supabase/migrations/$MIGRATION_FILE"
    elif echo "$ERROR_LINE" | grep -q "already exists.*INDEX"; then
        echo "  → Adding IF NOT EXISTS to CREATE INDEX"
        sed -i '' 's/^\(\s*\)CREATE INDEX \([^I]\)/\1CREATE INDEX IF NOT EXISTS \2/g' "supabase/migrations/$MIGRATION_FILE"
    elif echo "$ERROR_LINE" | grep -q "already exists.*TRIGGER"; then
        echo "  → Adding DROP IF EXISTS before CREATE TRIGGER"
        # Find trigger name and table
        TRIGGER_NAME=$(echo "$ERROR_LINE" | sed 's/.*trigger "\([^"]*\)".*/\1/')
        # This is complex - skip for now or use manual pattern
        echo "  ⚠️  Manual trigger fix needed for: $TRIGGER_NAME"
    elif echo "$ERROR_LINE" | grep -q "already exists.*POLICY"; then
        echo "  → Adding DROP IF EXISTS before CREATE POLICY"
        POLICY_NAME=$(echo "$ERROR_LINE" | sed 's/.*policy "\([^"]*\)".*/\1/')
        echo "  ⚠️  Manual policy fix needed for: $POLICY_NAME"
    elif echo "$ERROR_LINE" | grep -q "already exists.*TYPE"; then
        echo "  → Wrapping CREATE TYPE in DO block"
        # This needs manual fix
        echo "  ⚠️  Manual type fix needed"
    elif echo "$ERROR_LINE" | grep -q "syntax error"; then
        echo "  ⚠️  Syntax error detected - manual fix required"
        echo "$OUTPUT" | grep -A 5 "ERROR" | tail -10
        break
    fi
    
    sleep 1
done

echo ""
echo "⚠️  Deployment incomplete after $MAX_ITERATIONS iterations"
echo "Check migration-push-full.log for details"

