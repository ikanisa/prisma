#!/bin/bash
set -e

# Database connection
export PGPASSWORD="MoMo!!0099"
DB_URL="postgresql://postgres:MoMo!!0099@db.rcocfusrqrornukrnkln.supabase.co:5432/postgres"

echo "🚀 Starting Supabase migration deployment..."
echo "📦 Project: rcocfusrqrornukrnkln"
echo ""

# Create migrations tracking table if it doesn't exist
echo "📋 Setting up migration tracking..."
psql "$DB_URL" -c "
CREATE TABLE IF NOT EXISTS supabase_migrations (
    version TEXT PRIMARY KEY,
    name TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
" || echo "Migration table already exists or error occurred"

# Get list of all migrations in order
cd supabase/migrations
MIGRATIONS=($(ls -1 *.sql | sort))

echo "📊 Found ${#MIGRATIONS[@]} migration files"
echo ""

# Apply each migration
SUCCESS_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
    # Extract version from filename
    VERSION="${migration%.sql}"
    
    # Check if already applied
    APPLIED=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM supabase_migrations WHERE version = '$VERSION';" 2>/dev/null || echo "0")
    
    if [[ "$APPLIED" -gt 0 ]]; then
        echo "⏭️  Skipping $migration (already applied)"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    echo "▶️  Applying $migration..."
    
    # Apply migration
    if psql "$DB_URL" -f "$migration" 2>&1; then
        # Record successful migration
        psql "$DB_URL" -c "INSERT INTO supabase_migrations (version, name) VALUES ('$VERSION', '$migration');" >/dev/null
        echo "✅ Success: $migration"
        ((SUCCESS_COUNT++))
    else
        echo "❌ Failed: $migration"
        ((FAILED_COUNT++))
        # Continue with other migrations instead of exiting
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 Migration Summary:"
echo "   ✅ Applied:  $SUCCESS_COUNT"
echo "   ⏭️  Skipped:  $SKIPPED_COUNT"
echo "   ❌ Failed:   $FAILED_COUNT"
echo "   📦 Total:    ${#MIGRATIONS[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAILED_COUNT -eq 0 ]]; then
    echo "🎉 All migrations deployed successfully!"
    exit 0
else
    echo "⚠️  Some migrations failed. Please review the output above."
    exit 1
fi
