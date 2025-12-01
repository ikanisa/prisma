#!/bin/bash
# Quick Security Fixes - Apply critical production blockers
# Run from repository root: ./scripts/security-quick-fixes.sh

set -e

echo "🔒 Prisma Security Quick Fixes"
echo "=============================="
echo ""

# Check we're in repo root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from repository root"
    exit 1
fi

echo "✅ Repository root confirmed"
echo ""

# Backup files before modifying
echo "📦 Creating backups..."
mkdir -p .backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".backups/$(date +%Y%m%d_%H%M%S)"
cp server/main.py "$BACKUP_DIR/main.py.bak"
cp server/security_middleware.py "$BACKUP_DIR/security_middleware.py.bak" 2>/dev/null || true
echo "✅ Backups saved to $BACKUP_DIR"
echo ""

# Fix 1: Remove CORS wildcards
echo "🔧 Fix 1: Removing CORS wildcards from TrustedHostMiddleware"
if grep -q 'allowed_hosts=\["\*"\]' server/security_middleware.py 2>/dev/null; then
    echo "   Found wildcard in security_middleware.py"
    echo "   ⚠️  Manual fix required: Update allowed_hosts in server/security_middleware.py"
    echo "   Recommended: allowed_hosts=['prisma-glow.com', '*.prisma-glow.com', 'localhost']"
else
    echo "   ✅ No wildcard found in security_middleware.py"
fi
echo ""

# Fix 2: Check if rate limiting is applied
echo "🔧 Fix 2: Checking rate limiting configuration"
if grep -q "setup_rate_limiting(app)" server/main.py; then
    echo "   ✅ Rate limiting already configured in main.py"
else
    echo "   ⚠️  Rate limiting middleware not called in main.py"
    echo "   Action required: Add to server/main.py after app initialization:"
    echo ""
    echo "   from server.security_middleware import configure_security, setup_rate_limiting"
    echo "   limiter = setup_rate_limiting(app)"
    echo ""
fi
echo ""

# Fix 3: Check if security middleware is configured
echo "🔧 Fix 3: Checking security middleware configuration"
if grep -q "configure_security(app" server/main.py; then
    echo "   ✅ Security middleware already configured"
else
    echo "   ⚠️  Security middleware not configured in main.py"
    echo "   Action required: Add after CORS setup in server/main.py"
fi
echo ""

# Fix 4: Audit unprotected endpoints
echo "🔧 Fix 4: Auditing endpoint authentication"
TOTAL_ENDPOINTS=$(grep -E "^async def |^def " server/main.py | grep -E "@app\.(get|post|put|delete|patch)" | wc -l)
PROTECTED_ENDPOINTS=$(grep -n "Depends(require_auth)" server/main.py | wc -l)
echo "   Total endpoints: $TOTAL_ENDPOINTS"
echo "   Protected endpoints: $PROTECTED_ENDPOINTS"
if [ $PROTECTED_ENDPOINTS -lt $TOTAL_ENDPOINTS ]; then
    echo "   ⚠️  Some endpoints may not require authentication"
    echo "   Action required: Audit all endpoints and add Depends(require_auth) where needed"
else
    echo "   ✅ Authentication coverage looks good"
fi
echo ""

# Fix 5: Check JWT_SECRET configuration
echo "🔧 Fix 5: Checking JWT configuration"
if grep -q "SUPABASE_JWT_SECRET" server/main.py; then
    echo "   ✅ JWT_SECRET configured from environment"
    if [ -f ".env.example" ] && ! grep -q "SUPABASE_JWT_SECRET" .env.example; then
        echo "   ⚠️  SUPABASE_JWT_SECRET not documented in .env.example"
        echo "   Action required: Add to .env.example"
    fi
else
    echo "   ❌ JWT_SECRET not found in main.py"
fi
echo ""

# Generate report
echo "📊 Generating security audit report..."
cat > security-fixes-report.txt << EOF
Prisma Security Quick Fixes Report
Generated: $(date)

SUMMARY
=======
✅ Backups created: $BACKUP_DIR
⚠️  Manual fixes required (see below)

CHECKLIST
=========
[ ] Fix 1: Update allowed_hosts in server/security_middleware.py (line 106)
[ ] Fix 2: Call setup_rate_limiting(app) in server/main.py
[ ] Fix 3: Call configure_security(app) in server/main.py
[ ] Fix 4: Audit and protect all endpoints with Depends(require_auth)
[ ] Fix 5: Add SUPABASE_JWT_SECRET to .env.example if missing

NEXT STEPS
==========
1. Review this report and backups in $BACKUP_DIR
2. Apply manual fixes listed above
3. Run tests: pnpm run test && pytest
4. Commit changes: git commit -m "fix: apply critical security hardening"
5. Deploy to staging for validation

For detailed guidance, see: AUDIT_VALIDATION_REPORT_2025.md
EOF

cat security-fixes-report.txt
echo ""
echo "✅ Report saved to security-fixes-report.txt"
echo ""
echo "🎯 Next: Review the report and apply manual fixes"
echo "📖 See: AUDIT_VALIDATION_REPORT_2025.md for detailed instructions"
