#!/bin/bash
#
# Apply All Migrations via Supabase MCP Tools
# This script reads all migration files and applies them using MCP tools
#
# Usage: ./scripts/apply-all-migrations-via-mcp.sh
#

set -euo pipefail

# Configuration
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

log_header "🚀 Apply All Migrations via MCP"

# Check migrations directory
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Get all migration files sorted
MIGRATION_FILES=($(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort))

if [ ${#MIGRATION_FILES[@]} -eq 0 ]; then
    log_error "No migration files found"
    exit 1
fi

log_info "Found ${#MIGRATION_FILES[@]} migration files"
log_info "Project: $PROJECT_REF"
log_info "URL: $SUPABASE_URL"

log_header "📋 Migration List"

# Display migration files
for i in "${!MIGRATION_FILES[@]}"; do
    filename=$(basename "${MIGRATION_FILES[$i]}")
    printf "%4d. %s\n" $((i+1)) "$filename"
done

log_header "⚠️  Important Note"
log_warning "This script prepares migrations for MCP application."
log_warning "Actual application requires MCP server connection."
log_info ""
log_info "To apply migrations via MCP, you need to:"
log_info "  1. Ensure MCP Supabase server is connected"
log_info "  2. Verify project configuration matches"
log_info "  3. Apply migrations using mcp_supabase_apply_migration"
log_info ""
log_info "For CLI-based deployment, use:"
log_info "  ./scripts/deploy-supabase-all.sh"

log_header "📊 Migration Statistics"

total_lines=0
total_size=0

for migration_file in "${MIGRATION_FILES[@]}"; do
    lines=$(wc -l < "$migration_file" | tr -d ' ')
    size=$(stat -f%z "$migration_file" 2>/dev/null || stat -c%s "$migration_file" 2>/dev/null || echo 0)
    total_lines=$((total_lines + lines))
    total_size=$((total_size + size))
done

log_info "Total files: ${#MIGRATION_FILES[@]}"
log_info "Total lines: $total_lines"
log_info "Total size: $((total_size / 1024)) KB"

# Generate migration manifest
log_header "📝 Generating Migration Manifest"

MANIFEST_FILE=".supabase-migrations-manifest.json"

cat > "$MANIFEST_FILE" <<EOF
{
  "projectRef": "$PROJECT_REF",
  "supabaseUrl": "$SUPABASE_URL",
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totalMigrations": ${#MIGRATION_FILES[@]},
  "migrations": [
EOF

for i in "${!MIGRATION_FILES[@]}"; do
    migration_file="${MIGRATION_FILES[$i]}"
    filename=$(basename "$migration_file")
    relative_path="${migration_file#$PROJECT_ROOT/}"
    version=$(basename "$filename" .sql)

    # Get file stats
    lines=$(wc -l < "$migration_file" | tr -d ' ')
    size=$(stat -f%z "$migration_file" 2>/dev/null || stat -c%s "$migration_file" 2>/dev/null || echo 0)

    # Get first line for description
    first_line=$(head -n1 "$migration_file" | sed 's/-- //' | sed 's/^[[:space:]]*//' | head -c 100)

    cat >> "$MANIFEST_FILE" <<EOF
    {
      "index": $((i+1)),
      "filename": "$filename",
      "version": "$version",
      "path": "$relative_path",
      "lines": $lines,
      "size": $size,
      "description": "$first_line"
    }$([ $i -lt $((${#MIGRATION_FILES[@]} - 1)) ] && echo ',')
EOF
done

cat >> "$MANIFEST_FILE" <<EOF
  ]
}
EOF

log_success "Manifest saved to: $MANIFEST_FILE"

log_header "✅ Preparation Complete"
log_success "Migration manifest generated"
log_info ""
log_info "Next steps:"
log_info "  1. Review the manifest: cat $MANIFEST_FILE"
log_info "  2. Apply migrations via MCP tools or CLI"
log_info "  3. Verify deployment status"
log_info ""
log_info "To deploy now, run:"
log_info "  ./scripts/deploy-supabase-all.sh"
log_info ""

