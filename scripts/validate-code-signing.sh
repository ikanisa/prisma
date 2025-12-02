#!/bin/bash
# Validate Code Signing Configuration

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PRISMA GLOW - CODE SIGNING VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# Test 1: Check for entitlements file
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Entitlements File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "src-tauri/entitlements.plist" ]; then
    pass "Entitlements file exists"
    
    # Validate XML
    if plutil -lint src-tauri/entitlements.plist > /dev/null 2>&1; then
        pass "Entitlements file is valid XML"
    else
        fail "Entitlements file is invalid XML"
    fi
    
    # Check for required entitlements
    if grep -q "com.apple.security.network.client" src-tauri/entitlements.plist; then
        pass "Network client permission present"
    else
        warn "Network client permission missing"
    fi
    
    if grep -q "com.apple.security.cs.allow-jit" src-tauri/entitlements.plist; then
        pass "JIT permission present (required for WebView)"
    else
        fail "JIT permission missing (required for WebView)"
    fi
else
    fail "Entitlements file not found at src-tauri/entitlements.plist"
fi
echo ""

# Test 2: Check Tauri configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Tauri Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "src-tauri/tauri.conf.json" ]; then
    pass "Tauri config file exists"
    
    # Check for entitlements reference
    if grep -q '"entitlements"' src-tauri/tauri.conf.json; then
        pass "Entitlements referenced in config"
    else
        fail "Entitlements not referenced in config"
    fi
    
    # Check for hardened runtime
    if grep -q '"hardenedRuntime": true' src-tauri/tauri.conf.json; then
        pass "Hardened Runtime enabled"
    else
        fail "Hardened Runtime not enabled"
    fi
    
    # Check for DMG configuration
    if grep -q '"dmg"' src-tauri/tauri.conf.json; then
        pass "DMG configuration present"
    else
        warn "DMG configuration not found"
    fi
else
    fail "Tauri config file not found"
fi
echo ""

# Test 3: Check for signing identities (macOS only)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Code Signing Identities (macOS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$OSTYPE" == "darwin"* ]]; then
    IDENTITIES=$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" || echo "")
    
    if [ -n "$IDENTITIES" ]; then
        pass "Developer ID Application certificate found"
        echo "   $IDENTITIES"
    else
        warn "No Developer ID Application certificate found in keychain"
        echo "   → This is expected for development"
        echo "   → Required for production releases"
    fi
else
    warn "Not running on macOS - skipping identity check"
fi
echo ""

# Test 4: Check GitHub workflow
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: GitHub Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f ".github/workflows/desktop-app-release.yml" ]; then
    pass "Desktop app workflow exists"
    
    # Check for code signing steps
    if grep -q "Import code signing certificate" .github/workflows/desktop-app-release.yml; then
        pass "Code signing step present in workflow"
    else
        fail "Code signing step missing from workflow"
    fi
    
    # Check for notarization
    if grep -q "Notarize app" .github/workflows/desktop-app-release.yml; then
        pass "Notarization step present in workflow"
    else
        warn "Notarization step missing from workflow"
    fi
    
    # Check for universal binary
    if grep -q "universal-apple-darwin" .github/workflows/desktop-app-release.yml; then
        pass "Universal binary (Intel + Apple Silicon) configured"
    else
        warn "Universal binary not configured"
    fi
else
    fail "Desktop app workflow not found"
fi
echo ""

# Test 5: Check dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "src-tauri/Cargo.toml" ]; then
    # Check for updater plugin
    if grep -q "tauri-plugin-updater" src-tauri/Cargo.toml; then
        pass "Auto-updater plugin configured"
    else
        warn "Auto-updater plugin not found"
    fi
else
    fail "Cargo.toml not found"
fi
echo ""

# Test 6: Check LICENSE file
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: License File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "LICENSE" ]; then
    pass "LICENSE file exists"
else
    warn "LICENSE file not found (required for DMG)"
fi
echo ""

# Test 7: Test build (optional)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: Build Test (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$1" == "--build" ]; then
    echo "Running test build (this may take a few minutes)..."
    
    if pnpm tauri build --config '{"bundle":{"macOS":{"signingIdentity":null}}}' > /dev/null 2>&1; then
        pass "Test build successful"
        
        # Check if app was created
        if [ -d "src-tauri/target/release/bundle/macos" ]; then
            pass "App bundle created"
            
            APP_PATH=$(find src-tauri/target/release/bundle/macos -name "*.app" | head -n 1)
            if [ -n "$APP_PATH" ]; then
                APP_SIZE=$(du -sh "$APP_PATH" | cut -f1)
                echo "   App size: $APP_SIZE"
                
                # Check if app can be verified
                if codesign --verify --verbose "$APP_PATH" > /dev/null 2>&1; then
                    pass "App signature valid"
                else
                    warn "App not signed (expected for test build)"
                fi
            fi
        else
            fail "App bundle not found"
        fi
    else
        fail "Test build failed"
    fi
else
    warn "Skipping build test (use --build to enable)"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed:   $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed:   $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CRITICAL TESTS PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure GitHub secrets (see CODE_SIGNING_SETUP.md)"
    echo "2. Obtain Apple Developer ID certificate"
    echo "3. Test workflow: git push origin main"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please fix the failed tests before proceeding."
    echo "See CODE_SIGNING_SETUP.md for detailed instructions."
    echo ""
    exit 1
fi
