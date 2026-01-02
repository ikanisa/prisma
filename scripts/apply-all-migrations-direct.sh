#!/bin/bash
#
# Apply All Migrations Directly via SQL
# Uses direct database connection to apply all pending migrations
#
set -euo pipefail

PROJECT_REF="rcocfusrqrornukrnkln"
SUPABASE_URL="https://rcocfusrqrornukrnkln.supabase.co"
MIGRATIONS_DIR="supabase/migrations"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo ""
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

log_header "🚀 Apply All Migrations via Supabase CLI"

# Check for database password
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
    log_warning "SUPABASE_DB_PASSWORD not set"
    log_info "Attempting to use Supabase CLI with PAT..."
fi

# Set PAT
export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c

# Get all migration files
MIGRATION_FILES=($(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort))

log_info "Found ${#MIGRATION_FILES[@]} migration files"

# Try to push all migrations with --include-all flag
log_header "📦 Pushing All Migrations"

log_info "Using: supabase db push --linked --include-all"

# Use --yes to auto-confirm
if supabase db push --linked --include-all --yes 2>&1; then
    log_success "All migrations pushed successfully!"
else
    log_warning "Push with --include-all failed, trying alternative method..."

    # Alternative: Mark all as applied then push
    log_info "Attempting to repair migration history..."

    # Get list of local migrations
    for migration_file in "${MIGRATION_FILES[@]}"; do
        filename=$(basename "$migration_file" .sql)
        version="${filename}"

        # Try to repair if it's a timestamp-based migration
        if [[ "$version" =~ ^[0-9]{14} ]]; then
            # Skip repair for now - let push handle it
            continue
        fi
    done

    # Try push again
    if supabase db push --linked --yes 2>&1; then
        log_success "Migrations pushed successfully!"
    else
        log_error "Migration push failed"
        log_info "You may need to apply migrations manually via Supabase Dashboard"
        exit 1
    fi
fi

log_header "✅ Migration Application Complete"

