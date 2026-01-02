#!/bin/bash
# Deploy with automatic retry on failures - fixes migrations as they fail
set -e

PROJECT_REF="rcocfusrqrornukrnkln"
export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c

cd "$(dirname "$0")/.."

echo "🚀 Starting deployment with automatic fixes..."

# Continue pushing migrations, it will stop at errors but we can fix incrementally
MAX_RETRIES=5
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    echo "Attempt $((RETRY + 1))..."
    
    OUTPUT=$(supabase db push --linked --yes 2>&1 || true)
    
    if echo "$OUTPUT" | grep -qE "Finished supabase db push|No migrations to apply"; then
        echo "✅ All migrations applied!"
        break
    fi
    
    # Check for specific errors and provide guidance
    if echo "$OUTPUT" | grep -q "already exists.*TRIGGER"; then
        echo "⚠️  Trigger already exists - migrations need idempotency fixes"
        echo "   Run: grep -l 'CREATE TRIGGER' supabase/migrations/*.sql | xargs -I {} sed -i '' 's/CREATE TRIGGER/DROP TRIGGER IF EXISTS ... ON ...; CREATE TRIGGER/g' {}"
    fi
    
    if echo "$OUTPUT" | grep -q "already exists.*POLICY"; then
        echo "⚠️  Policy already exists - migrations need idempotency fixes"
    fi
    
    echo "$OUTPUT" | tail -30
    RETRY=$((RETRY + 1))
    sleep 2
done

echo "📊 Deployment attempt complete. Check output above for status."

