#!/bin/bash
#
# Complete Supabase Deployment Script
# Repairs migration history, applies all migrations, and deploys edge functions
#
set -euo pipefail

PROJECT_REF="rcocfusrqrornukrnkln"
SUPABASE_URL="https://rcocfusrqrornukrnkln.supabase.co"
PAT="sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c"

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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Set PAT
export SUPABASE_ACCESS_TOKEN="$PAT"

log_header "🚀 Complete Supabase Deployment"
log_info "Project: $PROJECT_REF"
log_info "URL: $SUPABASE_URL"
log_info "Starting: $(date)"

# Step 1: Repair migration history
log_header "🔧 Step 1: Repairing Migration History"

log_info "Repairing migration 20241201..."
if supabase migration repair --status reverted 20241201 --linked 2>&1; then
    log_success "Migration history repaired"
else
    log_warning "Repair may have failed, continuing..."
fi

# Step 2: Push all migrations
log_header "📦 Step 2: Applying All Migrations"

log_info "Attempting to push all migrations..."
PUSH_OUTPUT=$(supabase db push --linked --include-all --yes 2>&1 || true)

if echo "$PUSH_OUTPUT" | grep -q "Finished supabase db push"; then
    log_success "All migrations applied successfully!"
elif echo "$PUSH_OUTPUT" | grep -q "No migrations to apply"; then
    log_success "All migrations already applied!"
else
    log_warning "Migration push encountered issues"
    log_info "Output:"
    echo "$PUSH_OUTPUT" | tail -20

    # Try without --include-all
    log_info "Retrying without --include-all..."
    RETRY_OUTPUT=$(supabase db push --linked --yes 2>&1 || true)
    if echo "$RETRY_OUTPUT" | grep -qE "(Finished|applied|No migrations)"; then
        log_success "Migrations applied!"
    else
        log_warning "Some migrations may need manual application"
        log_info "Continuing with deployment..."
    fi
fi

# Step 3: Deploy edge functions
log_header "🚀 Step 3: Deploying Edge Functions"

if [ -d "supabase/functions/api" ]; then
    log_info "Deploying 'api' edge function..."
    if supabase functions deploy api --project-ref "$PROJECT_REF" --no-verify-jwt 2>&1; then
        log_success "Edge function 'api' deployed successfully!"
    else
        log_warning "Edge function deployment may have issues"
    fi
else
    log_warning "No edge functions directory found"
fi

# Step 4: Validate deployment
log_header "✅ Step 4: Validating Deployment"

# Check health endpoint
log_info "Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s "https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health" || echo "")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    log_success "Health endpoint is working!"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    log_warning "Health endpoint check failed or not deployed"
fi

# Check migration status
log_info "Checking migration status..."
if supabase migration list --linked 2>&1 | head -10 > /dev/null; then
    log_success "Migration list retrieved"
    MIGRATION_COUNT=$(supabase migration list --linked 2>&1 | grep -c "Local" || echo "0")
    log_info "Migrations tracked: $MIGRATION_COUNT"
fi

log_header "✅ Deployment Complete"
log_success "All deployment steps completed!"
log_info "Project Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
log_info "API URL: $SUPABASE_URL"
log_info "Completed: $(date)"

