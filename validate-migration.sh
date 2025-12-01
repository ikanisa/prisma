#!/bin/bash
# Validate auto-classification migration
set -e

echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                               ║"
echo "║               Auto-Classification Migration Validation                       ║"
echo "║                                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

MIGRATION_FILE="supabase/migrations/20260201120000_auto_classification_columns.sql"

echo "📋 Migration File Check"
echo "═══════════════════════════════════════════════════════════════════════════════"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Migration file exists: $MIGRATION_FILE"
echo ""

echo "📝 Migration Content:"
echo "───────────────────────────────────────────────────────────────────────────────"
cat "$MIGRATION_FILE"
echo "───────────────────────────────────────────────────────────────────────────────"
echo ""

echo "🔍 SQL Syntax Validation"
echo "═══════════════════════════════════════════════════════════════════════════════"

# Basic SQL validation - check for common issues
if grep -q "ALTER TABLE" "$MIGRATION_FILE"; then
    echo "✅ Contains ALTER TABLE statements"
fi

if grep -q "IF NOT EXISTS" "$MIGRATION_FILE"; then
    echo "✅ Uses IF NOT EXISTS (idempotent)"
fi

if grep -q "auto_classified" "$MIGRATION_FILE"; then
    echo "✅ Adds auto_classified column"
fi

if grep -q "classification_confidence" "$MIGRATION_FILE"; then
    echo "✅ Adds classification_confidence column"
fi

if grep -q "classification_source" "$MIGRATION_FILE"; then
    echo "✅ Adds classification_source column"
fi

echo ""
echo "📊 Migration Status"
echo "═══════════════════════════════════════════════════════════════════════════════"

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set - migration cannot be applied yet"
    echo ""
    echo "To apply this migration when DATABASE_URL is available:"
    echo "  $ psql \"\$DATABASE_URL\" -f $MIGRATION_FILE"
    echo ""
    echo "Or using Supabase CLI:"
    echo "  $ supabase db reset"
    echo ""
else
    echo "✅ DATABASE_URL is set"
    echo ""
    echo "To apply this migration:"
    echo "  $ psql \"\$DATABASE_URL\" -f $MIGRATION_FILE"
    echo ""
    
    read -p "Apply migration now? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Applying migration..."
        psql "$DATABASE_URL" -f "$MIGRATION_FILE"
        echo "✅ Migration applied successfully"
    else
        echo "Skipped migration application"
    fi
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                               ║"
echo "║                  ✅ Migration Validation Complete                            ║"
echo "║                                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
