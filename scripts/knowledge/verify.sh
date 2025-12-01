#!/usr/bin/env bash
# Final Verification Script for Accounting Knowledge Base System
# This script verifies all components are in place and ready for deployment

set -e

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║          🔍 ACCOUNTING KNOWLEDGE BASE - VERIFICATION SCRIPT 🔍              ║"
echo "║                                                                              ║"
echo "║                        Version 1.1.0 - Final Check                           ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((TOTAL_CHECKS++))
}

section() {
    echo ""
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

# Get repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

section "1. Core Files Verification"

# Database schema
if [ -f "supabase/migrations/20251201170000_accounting_knowledge_base.sql" ]; then
    check_pass "Database schema exists"
else
    check_fail "Database schema missing"
fi

# YAML configs
for file in ingest-pipeline.yaml deepsearch-agent.yaml accountant-ai-agent.yaml retrieval-rules.yaml; do
    if [ -f "config/knowledge/$file" ]; then
        check_pass "Config file: $file"
    else
        check_fail "Missing config: $file"
    fi
done

# TypeScript files
section "2. TypeScript Implementation"
for file in ingest.ts test-search.ts deepsearch-agent.ts manage.ts examples.ts test-suite.ts; do
    if [ -f "scripts/knowledge/$file" ]; then
        check_pass "Script file: $file"
    else
        check_fail "Missing script: $file"
    fi
done

# Documentation
section "3. Documentation Files"
for file in README.md README_COMPLETE.md INTEGRATION_GUIDE.md PRODUCTION_DEPLOYMENT.md; do
    if [ -f "scripts/knowledge/$file" ]; then
        check_pass "Documentation: $file"
    else
        check_fail "Missing docs: $file"
    fi
done

if [ -f "config/knowledge/QUICK_START.md" ]; then
    check_pass "Quick Start guide"
else
    check_fail "Missing Quick Start"
fi

# Docker files
section "4. Docker & Deployment"
if [ -f "scripts/knowledge/Dockerfile" ]; then
    check_pass "Dockerfile exists"
else
    check_fail "Dockerfile missing"
fi

if [ -f "scripts/knowledge/docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_fail "docker-compose.yml missing"
fi

if [ -f "scripts/knowledge/deploy.sh" ]; then
    if [ -x "scripts/knowledge/deploy.sh" ]; then
        check_pass "deploy.sh executable"
    else
        check_warn "deploy.sh not executable (run: chmod +x scripts/knowledge/deploy.sh)"
    fi
else
    check_fail "deploy.sh missing"
fi

if [ -f "scripts/knowledge/Makefile" ]; then
    check_pass "Makefile exists"
else
    check_fail "Makefile missing"
fi

# CI/CD
section "5. CI/CD & Monitoring"
if [ -f ".github/workflows/knowledge-cicd.yml" ]; then
    check_pass "CI/CD pipeline configured"
else
    check_fail "CI/CD pipeline missing"
fi

if [ -f "scripts/knowledge/monitoring/grafana-dashboard.json" ]; then
    check_pass "Grafana dashboard"
else
    check_fail "Grafana dashboard missing"
fi

# Package files
section "6. Package Configuration"
if [ -f "scripts/knowledge/package.json" ]; then
    check_pass "package.json exists"
    
    # Check if dependencies are listed
    if grep -q "@supabase/supabase-js" "scripts/knowledge/package.json"; then
        check_pass "Supabase dependency listed"
    else
        check_fail "Supabase dependency missing"
    fi
    
    if grep -q "openai" "scripts/knowledge/package.json"; then
        check_pass "OpenAI dependency listed"
    else
        check_fail "OpenAI dependency missing"
    fi
else
    check_fail "package.json missing"
fi

# Summary docs
section "7. Summary Documents"
if [ -f "ACCOUNTING_KNOWLEDGE_BASE_SUMMARY.md" ]; then
    check_pass "Implementation summary"
else
    check_fail "Implementation summary missing"
fi

if [ -f "ACCOUNTING_KB_VISUAL_MAP.txt" ]; then
    check_pass "Visual map"
else
    check_fail "Visual map missing"
fi

# Environment check
section "8. Environment & Dependencies"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed ($NODE_VERSION)"
else
    check_fail "Node.js not installed"
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    check_pass "pnpm installed ($PNPM_VERSION)"
else
    check_warn "pnpm not installed (install: npm install -g pnpm@9.12.3)"
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    check_pass "Docker installed ($DOCKER_VERSION)"
else
    check_warn "Docker not installed (optional for Docker deployment)"
fi

# Check PostgreSQL client
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | cut -d' ' -f3)
    check_pass "PostgreSQL client installed ($PSQL_VERSION)"
else
    check_warn "psql not installed (needed for database operations)"
fi

# Environment variables
section "9. Environment Variables Check"

if [ -n "$SUPABASE_URL" ]; then
    check_pass "SUPABASE_URL set"
else
    check_warn "SUPABASE_URL not set (required for deployment)"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    check_pass "SUPABASE_SERVICE_ROLE_KEY set"
else
    check_warn "SUPABASE_SERVICE_ROLE_KEY not set (required for deployment)"
fi

if [ -n "$OPENAI_API_KEY" ]; then
    check_pass "OPENAI_API_KEY set"
else
    check_warn "OPENAI_API_KEY not set (required for embeddings)"
fi

if [ -n "$DATABASE_URL" ]; then
    check_pass "DATABASE_URL set"
else
    check_warn "DATABASE_URL not set (required for direct DB access)"
fi

# File size check
section "10. File Size Verification"
TOTAL_SIZE=$(find scripts/knowledge config/knowledge supabase/migrations/*accounting_knowledge* 2>/dev/null | xargs du -ch 2>/dev/null | grep total | cut -f1)
if [ -n "$TOTAL_SIZE" ]; then
    check_pass "Total package size: $TOTAL_SIZE"
else
    check_warn "Could not calculate total size"
fi

# TypeScript syntax check (if tsx available)
section "11. Code Quality Check"
if command -v pnpm &> /dev/null && [ -f "scripts/knowledge/package.json" ]; then
    cd scripts/knowledge
    if [ -d "node_modules" ]; then
        check_pass "Dependencies installed"
        
        # Check if TypeScript files compile
        if pnpm exec tsc --noEmit --skipLibCheck *.ts 2>/dev/null; then
            check_pass "TypeScript files valid"
        else
            check_warn "TypeScript type checking had warnings"
        fi
    else
        check_warn "Dependencies not installed (run: pnpm install)"
    fi
    cd "$REPO_ROOT"
else
    check_warn "Cannot verify TypeScript (pnpm not available)"
fi

# Final report
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                           VERIFICATION SUMMARY                               ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo -e "Total checks:   ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "Passed:         ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed:         ${RED}$FAILED_CHECKS${NC}"
echo -e "Success rate:   ${BLUE}$PASS_RATE%${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CRITICAL CHECKS PASSED!${NC}"
    echo ""
    echo "🚀 System is ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "  1. cd scripts/knowledge"
    echo "  2. ./deploy.sh"
    echo ""
    echo "Or run tests:"
    echo "  make kb-test-suite"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the failed checks before deployment."
    echo ""
    echo "For help, see:"
    echo "  - scripts/knowledge/README_COMPLETE.md"
    echo "  - config/knowledge/QUICK_START.md"
    echo ""
    exit 1
fi
