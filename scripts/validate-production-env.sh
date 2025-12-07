#!/usr/bin/env bash
# =============================================================================
# Production Deployment Validation Script
# =============================================================================
# This script validates that all required environment variables are set
# before deploying to production using docker-compose.
#
# Usage:
#   ./scripts/validate-production-env.sh
#
# Exit codes:
#   0 - All required variables are set
#   1 - One or more required variables are missing
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "======================================================================"
echo "Production Environment Validation"
echo "======================================================================"
echo ""

# Function to check required variable
check_required() {
    local var_name="$1"
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} Missing required variable: $var_name"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name is set"
        return 0
    fi
}

# Function to check recommended variable
check_recommended() {
    local var_name="$1"
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠${NC} Recommended variable not set: $var_name"
        ((WARNINGS++))
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name is set"
        return 0
    fi
}

echo "Checking critical security variables..."
echo "----------------------------------------------------------------------"

# Supabase Configuration
check_required "SUPABASE_URL"
check_required "SUPABASE_ANON_KEY"
check_required "SUPABASE_JWT_SECRET"

# Security & CORS
check_required "GATEWAY_ALLOWED_ORIGINS"
check_required "API_ALLOWED_ORIGINS"

# Monitoring
check_required "SENTRY_DSN"

echo ""
echo "Checking database credentials..."
echo "----------------------------------------------------------------------"

check_required "POSTGRES_USER"
check_required "POSTGRES_PASSWORD"
check_required "POSTGRES_DB"

echo ""
echo "Checking service credentials..."
echo "----------------------------------------------------------------------"

check_required "MINIO_ROOT_USER"
check_required "MINIO_ROOT_PASSWORD"
check_required "SENTRY_SECRET_KEY"

echo ""
echo "Checking deployment configuration..."
echo "----------------------------------------------------------------------"

check_required "SERVICE_VERSION"
check_required "GATEWAY_IMAGE"
check_required "RAG_IMAGE"
check_required "AGENT_IMAGE"
check_required "ANALYTICS_IMAGE"

echo ""
echo "Checking recommended variables..."
echo "----------------------------------------------------------------------"

check_recommended "SUPABASE_SERVICE_ROLE_KEY"
check_recommended "OPENAI_API_KEY"
check_recommended "REDIS_PASSWORD"

echo ""
echo "======================================================================"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Validation FAILED${NC} - $ERRORS error(s) found"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}$WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please set all required environment variables before deployment."
    echo "See .env.example for reference."
    echo "======================================================================"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Validation PASSED with warnings${NC} - $WARNINGS warning(s) found"
    echo ""
    echo "Consider setting recommended variables for full functionality."
    echo "======================================================================"
    exit 0
else
    echo -e "${GREEN}✓ Validation PASSED${NC} - All required variables are set"
    echo "======================================================================"
    exit 0
fi
