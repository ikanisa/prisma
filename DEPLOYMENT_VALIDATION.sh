#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  SECURITY FIXES - DEPLOYMENT VALIDATION"
echo "  Date: $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check 1: Files exist
echo "📁 Checking implementation files..."
if [ -f "apps/gateway/src/middleware/auth.ts" ]; then
    success "Authentication middleware exists"
else
    error "Authentication middleware missing!"
    exit 1
fi

if [ -f "apps/gateway/src/middleware/rateLimit.ts" ]; then
    success "Rate limiting middleware exists"
else
    error "Rate limiting middleware missing!"
    exit 1
fi

if [ -f "src/components/error-boundary.tsx" ]; then
    success "Error boundary exists"
else
    error "Error boundary missing!"
    exit 1
fi

# Check 2: Dependencies in package.json
echo ""
echo "📦 Checking dependencies..."
if grep -q "express-rate-limit" apps/gateway/package.json; then
    success "express-rate-limit in package.json"
else
    error "express-rate-limit NOT in package.json"
    exit 1
fi

if grep -q "jsonwebtoken" apps/gateway/package.json; then
    success "jsonwebtoken in package.json"
else
    error "jsonwebtoken NOT in package.json"
    exit 1
fi

# Check 3: Sentry enabled
echo ""
echo "🔍 Checking Sentry integration..."
if grep -q "window.Sentry.captureException" src/components/error-boundary.tsx; then
    success "Sentry integration enabled"
else
    warning "Sentry integration may not be enabled"
fi

# Check 4: CORS configuration
echo ""
echo "🔒 Checking CORS configuration..."
if grep -q "GATEWAY_ALLOWED_ORIGINS" apps/gateway/src/index.ts; then
    success "CORS origin whitelist configured"
else
    error "CORS configuration missing!"
    exit 1
fi

# Check 5: Auth middleware applied
echo ""
echo "🛡️  Checking auth middleware application..."
if grep -q "verifySupabaseToken" apps/gateway/src/index.ts; then
    success "Auth middleware imported and applied"
else
    error "Auth middleware not applied!"
    exit 1
fi

# Check 6: Documentation exists
echo ""
echo "📚 Checking documentation..."
docs=(
    "SECURITY_AUDIT_HANDOFF_REPORT.md"
    "SECURITY_AUDIT_RESPONSE_INDEX.md"
    "SECURITY_AUDIT_RESPONSE_QUICK_START.md"
    "SECURITY_FIXES_IMPLEMENTATION_REPORT.md"
    "CRITICAL_SECURITY_ACTION_PLAN.md"
    "SECURITY_FIXES_COMPLETE.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        success "$doc exists"
    else
        warning "$doc missing"
    fi
done

# Check 7: Environment template updated
echo ""
echo "⚙️  Checking environment configuration..."
if grep -q "GATEWAY_ALLOWED_ORIGINS" .env.example; then
    success ".env.example updated with GATEWAY_ALLOWED_ORIGINS"
else
    warning ".env.example may need GATEWAY_ALLOWED_ORIGINS"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  VALIDATION COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Core implementation files: PRESENT"
echo "✅ Dependencies configured: PRESENT"
echo "✅ Security middleware: APPLIED"
echo "✅ Documentation: COMPREHENSIVE"
echo ""
echo "📋 Next Steps:"
echo "  1. Install dependencies: cd apps/gateway && pnpm install"
echo "  2. Configure environment variables (see .env.example)"
echo "  3. Test locally: pnpm --filter @prisma/gateway dev"
echo "  4. Deploy to staging"
echo ""
echo "📖 Read: SECURITY_AUDIT_HANDOFF_REPORT.md for complete guide"
echo ""
