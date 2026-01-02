#!/bin/bash
# Apply migrations directly via SQL execution using Supabase CLI
set -e

export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c
cd "$(dirname "$0")/.."

echo "🚀 Applying migrations via direct SQL execution..."

# Get all migration files
MIGRATIONS=($(find supabase/migrations -name "*.sql" -type f | sort))

# Get list of already applied migrations
APPLIED=$(supabase migration list --linked 2>&1 | grep "Remote" | awk '{print $2}' || echo "")

echo "Found ${#MIGRATIONS[@]} total migrations"

# Apply each migration that hasn't been applied
for migration_file in "${MIGRATIONS[@]}"; do
    filename=$(basename "$migration_file")
    version="${filename%.sql}"
    
    # Check if already applied
    if echo "$APPLIED" | grep -q "^$version$"; then
        echo "⏭️  Skipping $filename (already applied)"
        continue
    fi
    
    echo "▶️  Applying $filename..."
    
    # Try to apply via SQL execution
    if supabase db execute --linked --file "$migration_file" 2>&1; then
        echo "✅ Applied: $filename"
        # Record it
        supabase migration repair --status applied "$version" --linked > /dev/null 2>&1 || true
    else
        echo "❌ Failed: $filename"
        # Continue with next migration
    fi
    
    echo ""
done

echo "✅ Migration application complete!"

